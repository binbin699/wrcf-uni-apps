#!/bin/bash

# uni-app 云打包脚本
# 用于交互式选择配置并执行云打包
# 支持命令行参数传入，使用 --help 查看帮助

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[38;5;105m'    # 蓝紫色主题色 (灵矽品牌色)
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# 项目路径（脚本所在目录的上一级）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_PATH="$(cd "$SCRIPT_DIR/.." && pwd)"

# 配置文件路径
ENV_FILE="${PROJECT_PATH}/.env"
ENV_DEVELOPMENT_FILE="${PROJECT_PATH}/.env.development"
MANIFEST_FILE="${PROJECT_PATH}/src/manifest.json"
CLI_CONFIG_FILE="${PROJECT_PATH}/.cli-path"

# CLI 路径（将在后续函数中自动发现）
CLI_PATH=""

# 命令行参数变量（可通过参数覆盖）
ARG_CHANNEL=""
ARG_VERSION=""
ARG_VERSION_CODE=""
ARG_ABI=""
ARG_ANDROID_FORMAT=""
ARG_TARGET_SDK=""
ARG_IOS_PROFILE=""
ARG_IOS_CERT=""
ARG_IOS_CERT_PASSWORD=""
ARG_USE_DEV_BASE_API=false
ARG_YES=false
SELECTED_CHANNEL=""
ENV_DEVELOPMENT_BACKUP_FILE=""
ENV_DEVELOPMENT_RESTORE_NEEDED=false

# 当前打包 channel
SELECTED_PLATFORM=""
SELECTED_EDITION=""
PACKAGE_NAME=""
IOS_BUNDLE_ID=""

is_supported_channel() {
    case "$1" in
        app-android-cn|app-android-intl|app-ios-cn|app-ios-intl|app-harmony-cn|mp-weixin-cn) return 0 ;;
        *) return 1 ;;
    esac
}

is_pack_channel() {
    case "$1" in
        app-android-cn|app-android-intl|app-ios-cn|app-ios-intl) return 0 ;;
        *) return 1 ;;
    esac
}

set_channel_context() {
    case "$SELECTED_CHANNEL" in
        app-android-cn) SELECTED_PLATFORM="android"; SELECTED_EDITION="cn" ;;
        app-android-intl) SELECTED_PLATFORM="android"; SELECTED_EDITION="intl" ;;
        app-ios-cn) SELECTED_PLATFORM="ios"; SELECTED_EDITION="cn" ;;
        app-ios-intl) SELECTED_PLATFORM="ios"; SELECTED_EDITION="intl" ;;
        *)
            print_error "cloud-pack 仅支持 app-android/app-ios channel: ${SELECTED_CHANNEL}"
            exit 1
            ;;
    esac
}

resolve_selected_channel() {
    local channel="${ARG_CHANNEL:-${CHANNEL:-}}"
    if [ -n "$channel" ]; then
        if ! is_supported_channel "$channel"; then
            print_error "无效 channel: ${channel}"
            exit 1
        fi
        SELECTED_CHANNEL="$channel"
        set_channel_context
        return
    fi

    local channels=()
    local dir
    local dir_name
    for dir in "${PROJECT_PATH}/channels"/*/; do
        [ -d "$dir" ] || continue
        dir_name="$(basename "$dir")"
        if is_supported_channel "$dir_name" && [ -f "${dir}/config.json" ]; then
            channels+=("$dir_name")
        fi
    done

    if [ ${#channels[@]} -eq 0 ]; then
        print_error "当前仓库没有已应用的 channel 配置，请先执行 config:apply"
        exit 1
    fi

    if [ ${#channels[@]} -gt 1 ]; then
        print_error "当前仓库存在多个 channel，请通过 --channel 指定: ${channels[*]}"
        exit 1
    fi

    SELECTED_CHANNEL="${channels[0]}"
    if ! is_pack_channel "$SELECTED_CHANNEL"; then
        print_error "当前 channel 不能用于 App 云打包: ${SELECTED_CHANNEL}"
        exit 1
    fi
    set_channel_context
}

load_pack_identity_from_channel() {
    local identity_output
    identity_output=$(CHANNEL="${SELECTED_CHANNEL}" PROJECT_PATH="${PROJECT_PATH}" node --experimental-strip-types --experimental-specifier-resolution=node --input-type=module <<'EOF'
import { pathToFileURL } from 'node:url';

const { loadBrandConfig } = await import(
  pathToFileURL(`${process.env.PROJECT_PATH}/scripts/brand/lib/config.ts`).href
);

const config = loadBrandConfig({
  channel: process.env.CHANNEL,
  cwd: process.env.PROJECT_PATH,
  env: process.env
});

console.log(config.identity.packageName || '');
console.log(config.identity.iosBundleId || '');
EOF
)
    PACKAGE_NAME="$(echo "$identity_output" | sed -n '1p')"
    IOS_BUNDLE_ID="$(echo "$identity_output" | sed -n '2p')"

    if [ "$SELECTED_PLATFORM" == "android" ] && [ -z "$PACKAGE_NAME" ]; then
        print_error "当前 channel 缺少 identity.packageName: ${SELECTED_CHANNEL}"
        exit 1
    fi

    if [ "$SELECTED_PLATFORM" == "ios" ] && [ -z "$IOS_BUNDLE_ID" ]; then
        print_error "当前 channel 缺少 identity.iosBundleId: ${SELECTED_CHANNEL}"
        exit 1
    fi
}

run_brand_sync() {
    print_section "品牌配置同步"
    print_info "CHANNEL: ${SELECTED_CHANNEL}"

    CHANNEL="${SELECTED_CHANNEL}" pnpm --dir "$PROJECT_PATH" brand:sync -- --channel "${SELECTED_CHANNEL}"
    print_success "brand:sync 同步完成"
}

run_brand_build() {
    if [ "$SELECTED_PLATFORM" != "ios" ]; then
        return 0
    fi

    print_section "App 构建"
    print_info "CHANNEL: ${SELECTED_CHANNEL}"

    rm -rf "${PROJECT_PATH}/dist/build/app" "${PROJECT_PATH}/dist/build/app-plus"
    CHANNEL="${SELECTED_CHANNEL}" pnpm --dir "$PROJECT_PATH" run "build:brand:${SELECTED_CHANNEL}" -- --skip-sync

    local build_output="${PROJECT_PATH}/dist/build/app"
    if [ ! -f "${build_output}/manifest.json" ] || [ ! -f "${build_output}/app-service.js" ]; then
        print_error "App 构建产物不完整: ${build_output}"
        exit 1
    fi

    print_success "App 构建产物已生成: ${build_output}"
}

restore_env_development() {
    if [ "$ENV_DEVELOPMENT_RESTORE_NEEDED" != true ]; then
        return 0
    fi

    if [ -n "$ENV_DEVELOPMENT_BACKUP_FILE" ] && [ -f "$ENV_DEVELOPMENT_BACKUP_FILE" ]; then
        cp "$ENV_DEVELOPMENT_BACKUP_FILE" "$ENV_DEVELOPMENT_FILE"
        rm -f "$ENV_DEVELOPMENT_BACKUP_FILE"
        ENV_DEVELOPMENT_RESTORE_NEEDED=false
        print_info "已还原 .env.development"
    fi
}

cleanup_on_exit() {
    restore_env_development
}

trap cleanup_on_exit EXIT

has_active_dev_base_api() {
    [ -f "$ENV_DEVELOPMENT_FILE" ] && grep -Eq '^[[:space:]]*(export[[:space:]]+)?VITE_BASE_API_URL[[:space:]]*=' "$ENV_DEVELOPMENT_FILE"
}

get_dev_base_api_value() {
    sed -nE 's/^[[:space:]]*(export[[:space:]]+)?VITE_BASE_API_URL[[:space:]]*=[[:space:]]*(.*)$/\2/p' "$ENV_DEVELOPMENT_FILE" | head -1
}

disable_dev_base_api_for_pack() {
    ENV_DEVELOPMENT_BACKUP_FILE="$(mktemp)"
    cp "$ENV_DEVELOPMENT_FILE" "$ENV_DEVELOPMENT_BACKUP_FILE"
    ENV_DEVELOPMENT_RESTORE_NEEDED=true

    node - "$ENV_DEVELOPMENT_FILE" <<'EOF'
const fs = require('fs');
const filePath = process.argv[2];
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);
let changed = false;

const nextLines = lines.map((line) => {
  if (/^[ \t]*(export[ \t]+)?VITE_BASE_API_URL[ \t]*=/.test(line)) {
    changed = true;
    return `# [cloud-pack disabled] ${line}`;
  }
  return line;
});

if (changed) {
  fs.writeFileSync(filePath, nextLines.join('\n'));
}
EOF

    print_success "已临时屏蔽 .env.development 中的 VITE_BASE_API_URL"
}

guard_dev_base_api() {
    if ! has_active_dev_base_api; then
        return 0
    fi

    local dev_base_api
    dev_base_api="$(get_dev_base_api_value)"

    print_step "检查开发环境 API 覆盖"
    print_warning ".env.development 含 VITE_BASE_API_URL=${dev_base_api}"
    print_info "默认使用当前 channel 的 endpoints.baseApiUrl"

    if [ "$ARG_USE_DEV_BASE_API" = true ]; then
        print_warning "已选择沿用 .env.development 的 VITE_BASE_API_URL"
        return 0
    fi

    if [ "$ARG_YES" = true ]; then
        disable_dev_base_api_for_pack
        return 0
    fi

    print_option "1" "使用 channel endpoint" "临时屏蔽 .env.development，打包结束自动还原"
    print_option "2" "沿用 VITE_BASE_API_URL" "保留 .env.development 的覆盖值"
    read -p "  请选择 [1-2] (默认 1): " choice

    case "$choice" in
        2)
            print_warning "本次打包沿用 VITE_BASE_API_URL=${dev_base_api}"
            ;;
        *)
            disable_dev_base_api_for_pack
            ;;
    esac
}

# 显示帮助信息
show_help() {
    cat << EOF
uni-app 云打包脚本

用法: $(basename "$0") [选项]

选项:
  -h, --help                显示帮助信息
  -y, --yes                 跳过确认提示，直接打包

  --channel <channel>       打包 channel，如 app-android-cn、app-ios-cn
                            省略时使用当前已 apply 的唯一 channel
  --version <版本号>        版本号，如 1.1.5
  --version-code <代码>     版本代码，如 101050

Android 选项:
  --abi <32|64|both>        架构 (32=armeabi-v7a, 64=arm64-v8a, both=兼容包)
  --android-format <apk|aab> 打包格式 (apk=APK包, aab=AAB包用于Google Play)
  --target-sdk <版本号>     Android targetSdkVersion (默认 35)

iOS 选项:
  --ios-profile <路径>      描述文件路径 (.mobileprovision)
  --ios-cert <路径>         证书文件路径 (.p12)
  --ios-cert-password <密码> 证书私钥密码
  --use-dev-base-api        沿用 .env.development 中的 VITE_BASE_API_URL

示例:
  # 交互式模式
  $(basename "$0")

  # Android 打包（完整参数）
  $(basename "$0") --channel app-android-cn --version 1.1.5 \\
    --version-code 101050 --target-sdk 35 -y

  # Android AAB 打包（用于 Google Play）
  $(basename "$0") --channel app-android-intl --version 1.1.5 \\
    --version-code 101050 --abi 64 --android-format aab -y

  # iOS 打包（完整参数）
  $(basename "$0") --channel app-ios-cn --version 1.1.5 \\
    --version-code 101050 --ios-profile ~/cert/app.mobileprovision \\
    --ios-cert ~/cert/app.p12 --ios-cert-password mypassword -y

  # 部分参数（其余交互输入）
  $(basename "$0") --channel app-android-cn --version 1.1.5

EOF
    exit 0
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                ;;
            -y|--yes)
                ARG_YES=true
                shift
                ;;
            --channel)
                ARG_CHANNEL="$2"
                shift 2
                ;;
            --version)
                ARG_VERSION="$2"
                shift 2
                ;;
            --version-code)
                ARG_VERSION_CODE="$2"
                shift 2
                ;;
            --abi)
                ARG_ABI="$2"
                shift 2
                ;;
            --android-format)
                ARG_ANDROID_FORMAT="$2"
                shift 2
                ;;
            --target-sdk)
                ARG_TARGET_SDK="$2"
                shift 2
                ;;
            --ios-profile)
                ARG_IOS_PROFILE="$2"
                shift 2
                ;;
            --ios-cert)
                ARG_IOS_CERT="$2"
                shift 2
                ;;
            --ios-cert-password)
                ARG_IOS_CERT_PASSWORD="$2"
                shift 2
                ;;
            --use-dev-base-api)
                ARG_USE_DEV_BASE_API=true
                shift
                ;;
            *)
                print_error "未知参数: $1"
                echo "使用 --help 查看帮助"
                exit 1
                ;;
        esac
    done
}

# 打印彩色信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

is_dcloud_login_error() {
    local output="$1"
    echo "$output" | grep -Eqi 'user[[:space:]]+not[[:space:]]+login|not[[:space:]]+login|未登录|请登录|登录失败'
}

get_dcloud_user_account() {
    local output="$1"
    echo "$output" | sed '/^[[:space:]]*$/d;/^[0-9-]*:user info:/d' | head -1
}

print_dcloud_login_required() {
    print_error "DCloud 账号未登录，云打包已停止"
    print_info "请先登录 HBuilderX/DCloud 账号："
    echo -e "  ${DIM}${CLI_PATH} user login --username <账号> --password <密码>${NC}"
    print_info "登录完成后重新执行当前打包命令"
}

# ─── UI Helper Functions ─────────────────────────────────────────

# ASCII Art Banner
show_banner() {
    echo ""
    echo -e "${PURPLE}${BOLD}"
    cat << 'BANNER'
    ██╗     ██╗███╗   ██╗██╗  ██╗    ██████╗  █████╗  ██████╗██╗  ██╗
    ██║     ██║████╗  ██║╚██╗██╔╝    ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝
    ██║     ██║██╔██╗ ██║ ╚███╔╝     ██████╔╝███████║██║     █████╔╝
    ██║     ██║██║╚██╗██║ ██╔██╗     ██╔═══╝ ██╔══██║██║     ██╔═██╗
    ███████╗██║██║ ╚████║██╔╝ ██╗    ██║     ██║  ██║╚██████╗██║  ██╗
    ╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝    ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
BANNER
    echo -e "${NC}"
    echo -e "    ${DIM}配置与打包教程文档: ${NC}${PURPLE}https://lingxiwmp.qiniu.com/docs/publish/${NC}"
    echo ""
}

# Step counter for interactive flow
CURRENT_STEP=0

# Print a numbered step header
# Usage: print_step "选择版本类型"
print_step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    echo ""
    echo -e "  ${PURPLE}${BOLD}STEP ${CURRENT_STEP}${NC}  ${DIM}·${NC}  ${BOLD}$1${NC}"
    echo -e "  ${DIM}$(printf '%.0s─' {1..50})${NC}"
    echo ""
}

# Print a menu option
# Usage: print_option "1" "cn" "国内版"
print_option() {
    local key=$1
    local value=$2
    local desc=$3
    echo -e "    ${PURPLE}[${key}]${NC}  ${BOLD}${value}${NC}  ${DIM}·${NC}  ${desc}"
}

# Print a current-value hint below menu
# Usage: print_current "cn"
print_current() {
    echo ""
    echo -e "    ${DIM}当前: ${NC}${YELLOW}$1${NC}"
    echo ""
}

# Print a check item (for preflight checks)
# Usage: print_check "HBuilderX CLI found"
print_check() {
    echo -e "  ${PURPLE}[✓]${NC} $1"
}

# Print a fail item
print_fail() {
    echo -e "  ${RED}[✗]${NC} $1"
}

# Print a boxed section header (for non-step headers)
print_section() {
    local title="$1"
    local width=50
    local padding=$(( (width - ${#title} - 2) / 2 ))
    local pad_left=$(printf '%.0s─' $(seq 1 $padding))
    local pad_right=$(printf '%.0s─' $(seq 1 $((width - ${#title} - 2 - padding))))
    echo ""
    echo -e "  ${PURPLE}${pad_left}${NC} ${BOLD}${title}${NC} ${PURPLE}${pad_right}${NC}"
    echo ""
}

print_header() {
    echo -e "\n${PURPLE}========================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}========================================${NC}\n"
}

# 自动发现 HBuilderX CLI 路径
find_cli_path() {
    local cli_path=""

    # 1. 检查是否已保存配置
    if [ -f "$CLI_CONFIG_FILE" ]; then
        cli_path=$(cat "$CLI_CONFIG_FILE")
        if [ -f "$cli_path" ] && [ -x "$cli_path" ]; then
            echo "$cli_path"
            return 0
        fi
    fi

    # 2. 检查 PATH 环境变量
    if command -v cli &>/dev/null; then
        cli_path=$(command -v cli)
        echo "$cli_path"
        return 0
    fi

    # 3. 检查常见安装路径
    local common_paths=(
        "/Applications/HBuilderX.app/Contents/MacOS/cli"
        "/Applications/HBuilderX-Alpha.app/Contents/MacOS/cli"
        "$HOME/Applications/HBuilderX.app/Contents/MacOS/cli"
        "/opt/HBuilderX/cli"
        "/usr/local/bin/cli"
    )

    for path in "${common_paths[@]}"; do
        if [ -f "$path" ] && [ -x "$path" ]; then
            echo "$path"
            return 0
        fi
    done

    # 4. 未找到，提示用户手动输入
    echo ""
    echo "请提供 HBuilderX CLI 的完整路径，例如："
    echo "  macOS: /Applications/HBuilderX.app/Contents/MacOS/cli"
    echo "  Linux: /opt/HBuilderX/cli"
    echo ""
    read -p "请输入 CLI 路径 (或按 Ctrl+C 取消): " user_cli_path

    # 展开 ~ 为 HOME 目录
    user_cli_path="${user_cli_path/#\~/$HOME}"

    if [ -f "$user_cli_path" ] && [ -x "$user_cli_path" ]; then
        # 保存配置
        echo "$user_cli_path" > "$CLI_CONFIG_FILE"
        echo "$user_cli_path"
        return 0
    else
        return 1
    fi
}

# 检查 CLI 是否存在
check_cli() {
    print_section "Preflight Checks"

    local found_cli=$(find_cli_path)

    if [ -z "$found_cli" ] || [ ! -f "$found_cli" ]; then
        print_fail "HBuilderX CLI not found"
        exit 1
    fi

    CLI_PATH="$found_cli"

    # 检查是从哪里找到的
    if [ ! -f "$CLI_CONFIG_FILE" ]; then
        echo "$CLI_PATH" > "$CLI_CONFIG_FILE"
    fi

    print_check "HBuilderX CLI: ${DIM}${CLI_PATH}${NC}"
}

check_dcloud_login() {
    local login_output
    local dcloud_account

    if login_output=$("$CLI_PATH" user info 2>&1); then
        if is_dcloud_login_error "$login_output"; then
            print_dcloud_login_required
            exit 1
        fi

        dcloud_account="$(get_dcloud_user_account "$login_output")"
        if [ -z "$dcloud_account" ]; then
            print_dcloud_login_required
            exit 1
        fi

        print_check "DCloud 账号已登录: ${DIM}${dcloud_account}${NC}"
        return 0
    fi

    if is_dcloud_login_error "$login_output"; then
        print_dcloud_login_required
        exit 1
    fi

    print_error "DCloud 登录状态检查失败"
    echo "$login_output"
    exit 1
}

# 检查配置文件是否存在
check_config_files() {
    if [ ! -f "$ENV_FILE" ]; then
        local example_file="${PROJECT_PATH}/.env.example"
        if [ -f "$example_file" ]; then
            print_warning ".env 文件未找到，从 .env.example 自动复制"
            cp "$example_file" "$ENV_FILE"
        else
            print_fail ".env file missing"
            exit 1
        fi
    fi
    if [ ! -f "$MANIFEST_FILE" ]; then
        print_fail "manifest.json missing"
        exit 1
    fi
    print_check "Config files verified"
}

# 读取 JSON 值的辅助函数
get_json_value() {
    local file=$1
    local key=$2
    # 使用 node 读取 JSON (更可靠)
    node -pe "JSON.parse(require('fs').readFileSync('$file', 'utf8')).$key" 2>/dev/null || echo ""
}

# 读取 .env 文件中的值
get_env_value() {
    local key=$1
    grep "^${key}=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' '
}

# 读取当前配置
read_current_config() {
    print_section "Current Configuration"

    print_info "项目路径: ${YELLOW}${PROJECT_PATH}${NC}"

    # 读取 .env
    CURRENT_EDITION=$(get_env_value "VITE_APP_EDITION")

    # 读取 manifest.json
    CURRENT_VERSION=$(get_json_value "$MANIFEST_FILE" "versionName")
    CURRENT_VERSION_CODE=$(get_json_value "$MANIFEST_FILE" "versionCode")
    CURRENT_ABI_FILTERS=$(node -pe "JSON.parse(require('fs').readFileSync('$MANIFEST_FILE', 'utf8'))['app-plus'].distribute.android.abiFilters.join(', ')" 2>/dev/null || echo "")

    echo ""
    echo -e "    ${DIM}Edition${NC}        ${YELLOW}${CURRENT_EDITION}${NC}"
    echo -e "    ${DIM}Version${NC}        ${YELLOW}${CURRENT_VERSION}${NC} ${DIM}(${CURRENT_VERSION_CODE})${NC}"
    echo -e "    ${DIM}ABI${NC}            ${YELLOW}${CURRENT_ABI_FILTERS}${NC}"
    echo ""
}

# 读取当前已应用的 channel
select_pack_channel() {
    print_step "确认打包 channel"

    resolve_selected_channel
    load_pack_identity_from_channel

    print_success "Channel: ${SELECTED_CHANNEL} (${SELECTED_PLATFORM} / ${SELECTED_EDITION})"
    if [ "$SELECTED_PLATFORM" == "android" ]; then
        print_info "包名: ${PACKAGE_NAME}"
    else
        print_info "Bundle ID: ${IOS_BUNDLE_ID}"
    fi
}

# 用户选择版本号
select_version() {
    # 如果命令行参数已指定，直接使用
    if [ -n "$ARG_VERSION" ]; then
        SELECTED_VERSION="$ARG_VERSION"
        print_info "使用命令行参数: 版本号=${SELECTED_VERSION}"
        return
    fi

    print_step "选择版本号"
    echo -e "    ${DIM}当前版本号:${NC} ${YELLOW}${CURRENT_VERSION}${NC}"
    echo ""
    read -p "  输入新版本号 (留空保持当前): " new_version

    if [ -z "$new_version" ]; then
        SELECTED_VERSION="$CURRENT_VERSION"
    else
        SELECTED_VERSION="$new_version"
    fi

    print_success "选择版本号: ${SELECTED_VERSION}"
}

# 用户选择版本代码
select_version_code() {
    # 如果命令行参数已指定，直接使用
    if [ -n "$ARG_VERSION_CODE" ]; then
        SELECTED_VERSION_CODE="$ARG_VERSION_CODE"
        print_info "使用命令行参数: 版本代码=${SELECTED_VERSION_CODE}"
        return
    fi

    print_step "选择版本代码"
    echo -e "    ${DIM}当前版本代码:${NC} ${YELLOW}${CURRENT_VERSION_CODE}${NC}"
    echo ""
    read -p "  输入新版本代码 (留空保持当前): " new_code

    if [ -z "$new_code" ]; then
        SELECTED_VERSION_CODE="$CURRENT_VERSION_CODE"
    else
        SELECTED_VERSION_CODE="$new_code"
    fi

    print_success "选择版本代码: ${SELECTED_VERSION_CODE}"
}

# 用户选择安卓架构 (仅 Android)
select_android_abi() {
    # 如果命令行参数已指定，直接使用
    if [ -n "$ARG_ABI" ]; then
        case $ARG_ABI in
            32) SELECTED_ABI_FILTERS='["armeabi-v7a"]' ;;
            64) SELECTED_ABI_FILTERS='["arm64-v8a"]' ;;
            both) SELECTED_ABI_FILTERS='["armeabi-v7a", "arm64-v8a"]' ;;
            *) SELECTED_ABI_FILTERS='["armeabi-v7a", "arm64-v8a"]' ;;
        esac
        print_info "使用命令行参数: 架构=${SELECTED_ABI_FILTERS}"
        return
    fi

    print_step "选择安卓架构兼容性"
    print_option "1" "32/64位" "armeabi-v7a, arm64-v8a"
    print_option "2" "仅64位" "arm64-v8a"
    print_current "${CURRENT_ABI_FILTERS}"
    read -p "  请选择 [1-2] (留空保持当前): " choice

    case $choice in
        1) SELECTED_ABI_FILTERS='["armeabi-v7a", "arm64-v8a"]' ;;
        2) SELECTED_ABI_FILTERS='["arm64-v8a"]' ;;
        "")
            # 保持当前配置
            if [[ "$CURRENT_ABI_FILTERS" == *"armeabi-v7a"* ]]; then
                SELECTED_ABI_FILTERS='["armeabi-v7a", "arm64-v8a"]'
            else
                SELECTED_ABI_FILTERS='["arm64-v8a"]'
            fi
            ;;
        *) print_error "无效选择，使用当前配置"
            if [[ "$CURRENT_ABI_FILTERS" == *"armeabi-v7a"* ]]; then
                SELECTED_ABI_FILTERS='["armeabi-v7a", "arm64-v8a"]'
            else
                SELECTED_ABI_FILTERS='["arm64-v8a"]'
            fi
            ;;
    esac

    print_success "选择架构: ${SELECTED_ABI_FILTERS}"
}

# 用户选择 Android 打包格式
select_android_format() {
    # app-android-cn 固定使用 APK
    if [ "$SELECTED_CHANNEL" == "app-android-cn" ]; then
        SELECTED_ANDROID_FORMAT="apk"
        print_info "app-android-cn: 固定使用 APK 格式"
        return
    fi

    # 如果命令行参数已指定，直接使用
    if [ -n "$ARG_ANDROID_FORMAT" ]; then
        case $ARG_ANDROID_FORMAT in
            apk) SELECTED_ANDROID_FORMAT="apk" ;;
            aab) SELECTED_ANDROID_FORMAT="aab" ;;
            *) SELECTED_ANDROID_FORMAT="apk" ;;
        esac
        print_info "使用命令行参数: 打包格式=${SELECTED_ANDROID_FORMAT}"
        return
    fi

    print_step "选择 Android 打包格式"
    print_option "1" "APK" "标准安装包"
    print_option "2" "AAB" "Google Play 专用格式"
    echo ""
    read -p "  请选择 [1-2] (默认 APK): " choice

    case $choice in
        1) SELECTED_ANDROID_FORMAT="apk" ;;
        2) SELECTED_ANDROID_FORMAT="aab" ;;
        "") SELECTED_ANDROID_FORMAT="apk" ;;
        *) print_error "无效选择，使用 APK"; SELECTED_ANDROID_FORMAT="apk" ;;
    esac

    print_success "选择打包格式: ${SELECTED_ANDROID_FORMAT}"
}

# 用户选择 targetSdkVersion (仅 Android)
select_target_sdk_version() {
    # 如果命令行参数已指定，直接使用
    if [ -n "$ARG_TARGET_SDK" ]; then
        SELECTED_TARGET_SDK="$ARG_TARGET_SDK"
        print_info "使用命令行参数: targetSdkVersion=${SELECTED_TARGET_SDK}"
        return
    fi

    print_step "设置 targetSdkVersion"
    echo -e "    ${DIM}Android 目标 SDK 版本${NC}"
    echo ""
    read -p "  输入 targetSdkVersion (留空使用默认值 35): " sdk_input

    if [ -z "$sdk_input" ]; then
        SELECTED_TARGET_SDK="35"
    else
        SELECTED_TARGET_SDK="$sdk_input"
    fi

    print_success "targetSdkVersion: ${SELECTED_TARGET_SDK}"
}

# 配置 iOS 证书
configure_ios_certificate() {
    # 如果命令行参数已全部指定，直接使用
    if [ -n "$ARG_IOS_PROFILE" ] && [ -n "$ARG_IOS_CERT" ]; then
        IOS_PROFILE_FILE="${ARG_IOS_PROFILE/#\~/$HOME}"
        IOS_CERT_FILE="${ARG_IOS_CERT/#\~/$HOME}"
        IOS_CERT_PASSWORD="${ARG_IOS_CERT_PASSWORD:-}"

        # 验证文件存在
        if [ ! -f "$IOS_PROFILE_FILE" ]; then
            print_error "描述文件不存在: $IOS_PROFILE_FILE"
            exit 1
        fi
        if [ ! -f "$IOS_CERT_FILE" ]; then
            print_error "证书文件不存在: $IOS_CERT_FILE"
            exit 1
        fi

        print_info "使用命令行参数: iOS 证书配置"
        print_info "  描述文件: $IOS_PROFILE_FILE"
        print_info "  证书文件: $IOS_CERT_FILE"
        return
    fi

    print_step "配置 iOS 证书"

    echo -e "    ${DIM}iOS 打包需要以下文件:${NC}"
    echo -e "    ${DIM} - 证书文件 (.p12)${NC}"
    echo -e "    ${DIM} - 描述文件 (.mobileprovision)${NC}"
    echo -e "    ${DIM} - 证书私钥密码${NC}"
    echo ""

    # 自动发现 channel 目录下的证书文件作为默认值
    local default_profile=""
    local default_cert=""
    local region_dir="${PROJECT_PATH}/channels/${SELECTED_CHANNEL}/certs"

    if [ -d "$region_dir" ]; then
        # 查找 .mobileprovision 文件（取第一个）
        default_profile=$(find "$region_dir" -maxdepth 1 -name "*.mobileprovision" -type f 2>/dev/null | head -1)
        # 查找 .p12 文件（取第一个）
        default_cert=$(find "$region_dir" -maxdepth 1 -name "*.p12" -type f 2>/dev/null | head -1)
    fi

    if [ -n "$default_profile" ] || [ -n "$default_cert" ]; then
        print_info "在 ${region_dir} 中发现证书文件："
        [ -n "$default_profile" ] && echo "  描述文件: $(basename "$default_profile")"
        [ -n "$default_cert" ] && echo "  证书文件: $(basename "$default_cert")"
        echo ""
    fi

    # 描述文件路径
    while true; do
        if [ -n "$default_profile" ]; then
            read -p "描述文件路径 (.mobileprovision) [默认: $(basename "$default_profile")]: " profile_file
        else
            read -p "描述文件路径 (.mobileprovision): " profile_file
        fi

        # 留空时使用默认值
        if [ -z "$profile_file" ]; then
            if [ -n "$default_profile" ]; then
                profile_file="$default_profile"
            else
                print_error "描述文件路径不能为空"
                continue
            fi
        else
            profile_file="${profile_file/#\~/$HOME}"  # 展开 ~
        fi

        if [ ! -f "$profile_file" ]; then
            print_error "描述文件不存在: $profile_file"
            read -p "重新输入？[Y/n]: " retry
            if [[ "$retry" =~ ^[Nn]$ ]]; then
                print_error "取消打包"
                exit 1
            fi
        else
            IOS_PROFILE_FILE="$profile_file"
            print_success "描述文件: $IOS_PROFILE_FILE"
            break
        fi
    done

    # 证书文件路径
    while true; do
        if [ -n "$default_cert" ]; then
            read -p "证书文件路径 (.p12) [默认: $(basename "$default_cert")]: " cert_file
        else
            read -p "证书文件路径 (.p12): " cert_file
        fi

        # 留空时使用默认值
        if [ -z "$cert_file" ]; then
            if [ -n "$default_cert" ]; then
                cert_file="$default_cert"
            else
                print_error "证书文件路径不能为空"
                continue
            fi
        else
            cert_file="${cert_file/#\~/$HOME}"  # 展开 ~
        fi

        if [ ! -f "$cert_file" ]; then
            print_error "证书文件不存在: $cert_file"
            read -p "重新输入？[Y/n]: " retry
            if [[ "$retry" =~ ^[Nn]$ ]]; then
                print_error "取消打包"
                exit 1
            fi
        else
            IOS_CERT_FILE="$cert_file"
            print_success "证书文件: $IOS_CERT_FILE"
            break
        fi
    done

    # 证书密码
    echo ""
    read -sp "证书私钥密码: " cert_password
    echo ""

    if [ -z "$cert_password" ]; then
        print_warning "未输入密码，将使用空密码"
        IOS_CERT_PASSWORD=""
    else
        IOS_CERT_PASSWORD="$cert_password"
        print_success "已设置证书密码"
    fi

    echo ""
    print_success "iOS 证书配置完成"
}

# 更新 manifest.json 文件
update_manifest_file() {
    print_info "更新 manifest.json 文件..."

    # 根据平台决定是否更新 abiFilters 和 targetSdkVersion
    local update_abi="false"
    local abi_filters='["armeabi-v7a", "arm64-v8a"]'
    local update_target_sdk="false"

    if [ "$SELECTED_PLATFORM" == "android" ] && [ -n "$SELECTED_ABI_FILTERS" ]; then
        update_abi="true"
        abi_filters="$SELECTED_ABI_FILTERS"
    fi

    if [ "$SELECTED_PLATFORM" == "android" ] && [ -n "$SELECTED_TARGET_SDK" ]; then
        update_target_sdk="true"
    fi

    # 使用 node 脚本更新 JSON 文件
    node <<EOF
const fs = require('fs');
const manifestPath = '${MANIFEST_FILE}';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// 更新版本号
manifest.versionName = '${SELECTED_VERSION}';
manifest.versionCode = parseInt('${SELECTED_VERSION_CODE}');

// 更新安卓架构 (仅 Android 平台)
if ('${update_abi}' === 'true') {
    manifest['app-plus'].distribute.android.abiFilters = ${abi_filters};
}

// 更新 targetSdkVersion (仅 Android 平台)
if ('${update_target_sdk}' === 'true') {
    manifest['app-plus'].distribute.android.targetSdkVersion = parseInt('${SELECTED_TARGET_SDK}');
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
console.log('manifest.json 更新成功');
EOF

    print_success "已更新 manifest.json"
    print_info "  - versionName: ${SELECTED_VERSION}"
    print_info "  - versionCode: ${SELECTED_VERSION_CODE}"
    if [ "$SELECTED_PLATFORM" == "android" ]; then
        print_info "  - abiFilters: ${SELECTED_ABI_FILTERS}"
        print_info "  - targetSdkVersion: ${SELECTED_TARGET_SDK}"
    fi
}

# 显示打包配置摘要
show_summary() {
    echo ""
    echo -e "  ${PURPLE}┌─── Build Summary ────────────────────────────────────┐${NC}"
    echo -e "  ${PURPLE}│${NC}                                                      ${PURPLE}│${NC}"
    printf "  ${PURPLE}│${NC}  ${DIM}Channel:${NC}     %-40s ${PURPLE}│${NC}\n" "${SELECTED_CHANNEL}"
    printf "  ${PURPLE}│${NC}  ${DIM}Version:${NC}     %-40s ${PURPLE}│${NC}\n" "${SELECTED_VERSION} (${SELECTED_VERSION_CODE})"
    printf "  ${PURPLE}│${NC}  ${DIM}Platform:${NC}    %-40s ${PURPLE}│${NC}\n" "${SELECTED_PLATFORM}"
    printf "  ${PURPLE}│${NC}  ${DIM}Edition:${NC}     %-40s ${PURPLE}│${NC}\n" "${SELECTED_EDITION}"

    if [ "$SELECTED_PLATFORM" == "android" ]; then
        printf "  ${PURPLE}│${NC}  ${DIM}Package:${NC}     %-40s ${PURPLE}│${NC}\n" "${PACKAGE_NAME}"
        printf "  ${PURPLE}│${NC}  ${DIM}ABI:${NC}         %-40s ${PURPLE}│${NC}\n" "${SELECTED_ABI_FILTERS}"
        printf "  ${PURPLE}│${NC}  ${DIM}Format:${NC}      %-40s ${PURPLE}│${NC}\n" "${SELECTED_ANDROID_FORMAT}"
        printf "  ${PURPLE}│${NC}  ${DIM}TargetSDK:${NC}   %-40s ${PURPLE}│${NC}\n" "${SELECTED_TARGET_SDK}"
    else
        printf "  ${PURPLE}│${NC}  ${DIM}Bundle ID:${NC}   %-40s ${PURPLE}│${NC}\n" "${IOS_BUNDLE_ID}"
        printf "  ${PURPLE}│${NC}  ${DIM}Profile:${NC}     %-40s ${PURPLE}│${NC}\n" "$(basename "${IOS_PROFILE_FILE}")"
        printf "  ${PURPLE}│${NC}  ${DIM}Cert:${NC}        %-40s ${PURPLE}│${NC}\n" "$(basename "${IOS_CERT_FILE}")"
    fi

    echo -e "  ${PURPLE}│${NC}                                                      ${PURPLE}│${NC}"
    echo -e "  ${PURPLE}└──────────────────────────────────────────────────────┘${NC}"
    echo ""

    # 如果使用 -y 参数，跳过确认
    if [ "$ARG_YES" = true ]; then
        print_info "使用 -y 参数，跳过确认"
        return
    fi

    read -p "  确认开始打包? [y/N]: " confirm

    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        print_warning "取消打包"
        exit 0
    fi
}

# 提取并显示下载链接
extract_download_link() {
    local output="$1"

    # 提取下载地址
    local download_url=$(echo "$output" | grep -oE 'https://[^ ]+/build/download/[a-f0-9-]+' | head -1)

    if [ -n "$download_url" ]; then
        echo ""
        echo -e "${PURPLE}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${PURPLE}║                              📦 打包成功！                                      ║${NC}"
        echo -e "${PURPLE}╚════════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}📥 下载地址:${NC}"
        echo -e "${BLUE}${download_url}${NC}"
        echo ""
        echo -e "${RED}⚠️  注意: 该地址为临时下载地址，只能下载 5 次！${NC}"
        echo ""

        # 提取加固链接
        local safe_link=$(echo "$output" | grep -oE 'https://dev.dcloud.net.cn/pages/common/redirect[^)]+app-safe[^)]+' | head -1)
        if [ -n "$safe_link" ]; then
            echo -e "${YELLOW}🔒 一键加固:${NC} ${safe_link}"
        fi

        # 提取发布链接
        local publish_link=$(echo "$output" | grep -oE 'https://dev.dcloud.net.cn/pages/common/redirect[^)]+uni-publish[^)]+' | head -1)
        if [ -n "$publish_link" ]; then
            echo -e "${YELLOW}🚀 一键发布:${NC} ${publish_link}"
        fi

        echo ""
        return 0
    fi

    return 0
}

# Linux 环境准备（HBuilderX daemon 启动 + TLS 修复）
# 仅在 Linux 上执行，macOS 不受影响
prepare_linux_env() {
    if [ "$(uname -s)" != "Linux" ]; then
        return 0
    fi

    print_section "Linux 环境准备"

    # 修复 TLS 静态块内存分配错误
    #   错误: uts.linux-x64-gnu.node: cannot allocate memory in static TLS block
    #   原因: glibc 默认预留的 TLS 静态空间不足，dlopen() 加载 .node 时失败
    #   修复: 通过 GLIBC_TUNABLES 让 glibc 动态链接器额外预留 TLS 空间
    #   重要: GLIBC_TUNABLES 必须在 daemon 启动前设置，因为编译实际运行在
    #         daemon 进程内部的 node 子进程中，不是 cli pack 的子进程。
    #         如果 daemon 已经在运行且没有此变量，必须重启 daemon。
    export GLIBC_TUNABLES=glibc.rtld.optional_static_tls=16384

    # 检查现有 daemon 是否带有 GLIBC_TUNABLES
    local need_restart=false
    local daemon_pid
    daemon_pid=$(pgrep -f "HBuilderX" | head -1)

    if [ -n "$daemon_pid" ]; then
        # 检查 daemon 进程环境中是否已有 GLIBC_TUNABLES
        if ! tr '\0' '\n' < "/proc/$daemon_pid/environ" 2>/dev/null | grep -q "GLIBC_TUNABLES"; then
            print_warning "HBuilderX daemon 运行中但缺少 TLS fix，需要重启..."
            need_restart=true
        else
            print_check "HBuilderX daemon 已在运行 (含 TLS 修复)"
        fi
    else
        need_restart=true
    fi

    if [ "$need_restart" = true ]; then
        # 杀掉现有 daemon（如有）
        if [ -n "$daemon_pid" ]; then
            print_info "停止现有 HBuilderX daemon..."
            pkill -f "HBuilderX" 2>/dev/null || true
            sleep 1
        fi

        # 带 GLIBC_TUNABLES 启动新 daemon
        print_info "启动 HBuilderX daemon (含 TLS 修复)..."
        nohup "$CLI_PATH" open > /tmp/hbuilderx-daemon.log 2>&1 &

        # 等待 daemon 就绪
        local wait_count=0
        local max_wait=30
        while [ $wait_count -lt $max_wait ]; do
            if pgrep -f "HBuilderX" > /dev/null 2>&1; then
                break
            fi
            sleep 1
            wait_count=$((wait_count + 1))
        done

        if ! pgrep -f "HBuilderX" > /dev/null 2>&1; then
            print_error "HBuilderX daemon 启动失败 (等待 ${max_wait}s)"
            exit 1
        fi

        # 验证新 daemon 确实带有 GLIBC_TUNABLES
        local new_pid
        new_pid=$(pgrep -f "HBuilderX" | head -1)
        if tr '\0' '\n' < "/proc/$new_pid/environ" 2>/dev/null | grep -q "GLIBC_TUNABLES"; then
            # 额外等待几秒让 daemon 初始化完成
            sleep 3
            print_check "HBuilderX daemon 已启动 (含 TLS 修复)"
        else
            print_error "HBuilderX daemon 已启动但 GLIBC_TUNABLES 未生效"
            exit 1
        fi
    fi
}

# 执行云打包
execute_pack() {
    print_section "Executing Build"
    export CHANNEL="${SELECTED_CHANNEL}"

    # 创建临时文件保存输出
    local temp_output=$(mktemp)
    local pack_cmd=""

    if [ "$SELECTED_PLATFORM" == "android" ]; then
        # Android 打包
        print_info "Platform: ${YELLOW}Android${NC} · Format: ${YELLOW}${SELECTED_ANDROID_FORMAT}${NC}"

        # 使用 expect 处理交互提示
        print_info "启动打包任务..."

        if [ "$SELECTED_ANDROID_FORMAT" == "aab" ]; then
            print_info "使用 Google Play 渠道生成 AAB 格式"
            expect <<EOF | tee "$temp_output"
set timeout -1
spawn "$CLI_PATH" pack --project "$PROJECT_PATH" --platform android --android.packagename "$PACKAGE_NAME" --android.androidpacktype 3 --android.channels google --safemode false
expect {
    "是否继续提交" {
        puts "\n\[QUEUE_CONFLICT\] 检测到云端已有正在进行的打包任务"
        catch {close} ; catch {wait}
        exit 10
    }
    "是否覆盖" {
        send "y\r"
        exp_continue
    }
    eof
}
EOF
        else
            expect <<EOF | tee "$temp_output"
set timeout -1
spawn "$CLI_PATH" pack --project "$PROJECT_PATH" --platform android --android.packagename "$PACKAGE_NAME" --android.androidpacktype 3 --safemode false
expect {
    "是否继续提交" {
        puts "\n\[QUEUE_CONFLICT\] 检测到云端已有正在进行的打包任务"
        catch {close} ; catch {wait}
        exit 10
    }
    "是否覆盖" {
        send "y\r"
        exp_continue
    }
    eof
}
EOF
        fi
    else
        # iOS 打包 (使用自定义证书)
        print_info "执行 iOS 云打包..."
        print_info "Bundle ID: ${IOS_BUNDLE_ID}"
        print_info "证书文件: ${IOS_CERT_FILE}"
        print_info "描述文件: ${IOS_PROFILE_FILE}"

        expect <<EOF | tee "$temp_output"
set timeout -1
spawn "$CLI_PATH" pack --project "$PROJECT_PATH" --platform ios --ios.bundle "$IOS_BUNDLE_ID" --ios.certfile "$IOS_CERT_FILE" --ios.certpassword "$IOS_CERT_PASSWORD" --ios.profile "$IOS_PROFILE_FILE" --safemode false
expect {
    "是否继续提交" {
        puts "\n\[QUEUE_CONFLICT\] 检测到云端已有正在进行的打包任务"
        catch {close} ; catch {wait}
        exit 10
    }
    "是否覆盖" {
        send "y\r"
        exp_continue
    }
    eof
}
EOF
    fi

    local exit_code=${PIPESTATUS[0]}

    if [ $exit_code -eq 10 ]; then
        # 云端已有正在进行的打包任务
        echo ""
        print_error "════════════════════════════════════════════════════════"
        print_error "  云端已有正在进行的打包任务，无法重复提交"
        print_error "  请等待当前打包任务完成后再试"
        print_error "════════════════════════════════════════════════════════"
        echo ""
        rm -f "$temp_output"
        exit 1
    elif [ $exit_code -eq 0 ]; then
        local pack_output
        pack_output="$(cat "$temp_output")"

        if is_dcloud_login_error "$pack_output"; then
            print_dcloud_login_required
            rm -f "$temp_output"
            exit 1
        fi

        # 提取并显示下载链接
        extract_download_link "$pack_output"

        # Android 打包完成后恢复 abiFilters 为兼容配置
        if [ "$SELECTED_PLATFORM" == "android" ]; then
            restore_abi_filters
        fi
    else
        print_error "打包命令执行失败 (退出代码: $exit_code)"
        rm -f "$temp_output"
        exit 1
    fi

    # 清理临时文件
    rm -f "$temp_output"

}

# 恢复 abiFilters 为兼容配置
restore_abi_filters() {
    print_info "恢复 abiFilters 为兼容配置..."

    node <<EOF
const fs = require('fs');
const manifestPath = '${MANIFEST_FILE}';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// 恢复为 32/64 位兼容配置
manifest['app-plus'].distribute.android.abiFilters = ["armeabi-v7a", "arm64-v8a"];

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
EOF

    print_success "已恢复 abiFilters: [\"armeabi-v7a\", \"arm64-v8a\"]"
}

# 主流程
main() {
    show_banner

    # 检查环境
    check_cli
    check_dcloud_login
    check_config_files

    # 读取当前配置
    read_current_config

    # 用户交互选择
    CURRENT_STEP=0
    # STEP 编号由 print_step 自动递增

    select_pack_channel
    guard_dev_base_api
    select_version
    select_version_code

    # 根据平台执行平台特定配置
    if [ "$SELECTED_PLATFORM" == "android" ]; then
        select_android_abi
        select_android_format
        select_target_sdk_version
    fi

    if [ "$SELECTED_PLATFORM" == "ios" ]; then
        configure_ios_certificate
    fi

    run_brand_sync
    load_pack_identity_from_channel

    # 显示摘要并确认
    show_summary

    # 更新打包版本与平台参数
    update_manifest_file
    run_brand_build

    # Linux 环境准备（daemon + TLS 修复）
    prepare_linux_env

    # 执行打包
    execute_pack

    # 完成
    echo ""
    echo -e "  ${PURPLE}${BOLD}┌──────────────────────────────────────────────────────┐${NC}"
    echo -e "  ${PURPLE}${BOLD}│                   BUILD COMPLETE                     │${NC}"
    echo -e "  ${PURPLE}${BOLD}└──────────────────────────────────────────────────────┘${NC}"
    echo ""
}

# 运行主流程
parse_args "$@"
main
