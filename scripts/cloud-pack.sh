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
NC='\033[0m' # No Color

# 项目路径（脚本所在目录的上一级）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_PATH="$(cd "$SCRIPT_DIR/.." && pwd)"

# 配置文件路径
ENV_FILE="${PROJECT_PATH}/.env"
MANIFEST_FILE="${PROJECT_PATH}/src/manifest.json"
CLI_CONFIG_FILE="${PROJECT_PATH}/.cli-path"

# CLI 路径（将在后续函数中自动发现）
CLI_PATH=""

# 命令行参数变量（可通过参数覆盖）
ARG_EDITION=""
ARG_VERSION=""
ARG_VERSION_CODE=""
ARG_PLATFORM=""
ARG_ABI=""
ARG_PACKAGE_NAME=""
ARG_ANDROID_FORMAT=""
ARG_IOS_REGION=""
ARG_IOS_BUNDLE_ID=""
ARG_IOS_PROFILE=""
ARG_IOS_CERT=""
ARG_IOS_CERT_PASSWORD=""
ARG_YES=false

# 显示帮助信息
show_help() {
    cat << EOF
uni-app 云打包脚本

用法: $(basename "$0") [选项]

选项:
  -h, --help                显示帮助信息
  -y, --yes                 跳过确认提示，直接打包
  
  --edition <cn|intl|full>  版本类型 (cn=国内版, intl=海外版, full=完整版)
  --version <版本号>        版本号，如 1.1.5
  --version-code <代码>     版本代码，如 101050
  --platform <android|ios>  打包平台
  
Android 选项:
  --abi <32|64|both>        架构 (32=armeabi-v7a, 64=arm64-v8a, both=兼容包)
  --package-name <包名>     Android 包名，如 com.example.app
  --android-format <apk|aab> 打包格式 (apk=APK包, aab=AAB包用于Google Play)

iOS 选项:
  --ios-region <cn|intl>    iOS 区域 (cn=国内版, intl=海外版)
  --ios-bundle-id <ID>      iOS Bundle ID
  --ios-profile <路径>      描述文件路径 (.mobileprovision)
  --ios-cert <路径>         证书文件路径 (.p12)
  --ios-cert-password <密码> 证书私钥密码

示例:
  # 交互式模式
  $(basename "$0")

  # Android 打包（完整参数）
  $(basename "$0") --platform android --edition cn --version 1.1.5 \\
    --version-code 101050 --abi 64 --package-name com.example.app -y

  # Android AAB 打包（用于 Google Play）
  $(basename "$0") --platform android --edition intl --version 1.1.5 \\
    --version-code 101050 --abi 64 --package-name com.example.app \\
    --android-format aab -y

  # iOS 打包（完整参数）
  $(basename "$0") --platform ios --edition cn --version 1.1.5 \\
    --version-code 101050 --ios-region cn --ios-bundle-id com.example.app \\
    --ios-profile ~/cert/app.mobileprovision --ios-cert ~/cert/app.p12 \\
    --ios-cert-password mypassword -y

  # 部分参数（其余交互输入）
  $(basename "$0") --platform android --version 1.1.5

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
            --edition)
                ARG_EDITION="$2"
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
            --platform)
                ARG_PLATFORM="$2"
                shift 2
                ;;
            --abi)
                ARG_ABI="$2"
                shift 2
                ;;
            --package-name)
                ARG_PACKAGE_NAME="$2"
                shift 2
                ;;
            --android-format)
                ARG_ANDROID_FORMAT="$2"
                shift 2
                ;;
            --ios-region)
                ARG_IOS_REGION="$2"
                shift 2
                ;;
            --ios-bundle-id)
                ARG_IOS_BUNDLE_ID="$2"
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

print_header() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}\n"
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
    print_info "正在查找 HBuilderX CLI..."
    
    local found_cli=$(find_cli_path)
    
    if [ -z "$found_cli" ] || [ ! -f "$found_cli" ]; then
        print_error "无法找到 HBuilderX CLI"
        exit 1
    fi
    
    CLI_PATH="$found_cli"
    
    # 检查是从哪里找到的
    if [ -f "$CLI_CONFIG_FILE" ]; then
        print_success "从配置文件读取 CLI 路径"
    else
        # 保存到配置文件
        echo "$CLI_PATH" > "$CLI_CONFIG_FILE"
        print_info "已保存 CLI 路径配置到: .cli-path"
    fi
    
    print_success "找到 HBuilderX CLI: $CLI_PATH"
}

# 检查配置文件是否存在
check_config_files() {
    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env 文件未找到: $ENV_FILE"
        exit 1
    fi
    if [ ! -f "$MANIFEST_FILE" ]; then
        print_error "manifest.json 文件未找到: $MANIFEST_FILE"
        exit 1
    fi
    print_success "配置文件检查通过"
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
    print_header "读取当前配置"
    
    print_info "项目路径: ${YELLOW}${PROJECT_PATH}${NC}"
    
    # 读取 .env
    CURRENT_EDITION=$(get_env_value "VITE_APP_EDITION")
    
    # 读取 manifest.json
    CURRENT_VERSION=$(get_json_value "$MANIFEST_FILE" "versionName")
    CURRENT_VERSION_CODE=$(get_json_value "$MANIFEST_FILE" "versionCode")
    CURRENT_ABI_FILTERS=$(node -pe "JSON.parse(require('fs').readFileSync('$MANIFEST_FILE', 'utf8'))['app-plus'].distribute.android.abiFilters.join(', ')" 2>/dev/null || echo "")
    BUNDLE_NAME=$(node -pe "JSON.parse(require('fs').readFileSync('$MANIFEST_FILE', 'utf8'))['app-harmony'].distribute.bundleName" 2>/dev/null || echo "com.qiniu.linx")
    
    print_info "当前包名: ${YELLOW}${BUNDLE_NAME}${NC}"
    print_info "当前版本类型: ${YELLOW}${CURRENT_EDITION}${NC}"
    print_info "当前版本号: ${YELLOW}${CURRENT_VERSION}${NC}"
    print_info "当前版本代码: ${YELLOW}${CURRENT_VERSION_CODE}${NC}"
    print_info "当前安卓架构: ${YELLOW}${CURRENT_ABI_FILTERS}${NC}"
}

# 用户选择版本类型
select_edition() {
    # 如果命令行参数已指定，直接使用
    if [ -n "$ARG_EDITION" ]; then
        SELECTED_EDITION="$ARG_EDITION"
        print_info "使用命令行参数: 版本类型=${SELECTED_EDITION}"
        return
    fi
    
    print_header "选择版本类型"
    echo "1) cn   - 国内版"
    echo "2) intl - 海外版"
    echo "3) full - 完整版"
    echo "当前: ${CURRENT_EDITION}"
    echo ""
    read -p "请选择 [1-3] (留空保持当前): " choice
    
    case $choice in
        1) SELECTED_EDITION="cn" ;;
        2) SELECTED_EDITION="intl" ;;
        3) SELECTED_EDITION="full" ;;
        "") SELECTED_EDITION="$CURRENT_EDITION" ;;
        *) print_error "无效选择，使用当前配置"; SELECTED_EDITION="$CURRENT_EDITION" ;;
    esac
    
    print_success "选择版本类型: ${SELECTED_EDITION}"
}

# 用户选择版本号
select_version() {
    # 如果命令行参数已指定，直接使用
    if [ -n "$ARG_VERSION" ]; then
        SELECTED_VERSION="$ARG_VERSION"
        print_info "使用命令行参数: 版本号=${SELECTED_VERSION}"
        return
    fi
    
    print_header "选择版本号"
    echo "当前版本号: ${CURRENT_VERSION}"
    read -p "输入新版本号 (留空保持当前): " new_version
    
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
    
    print_header "选择版本代码"
    echo "当前版本代码: ${CURRENT_VERSION_CODE}"
    read -p "输入新版本代码 (留空保持当前): " new_code
    
    if [ -z "$new_code" ]; then
        SELECTED_VERSION_CODE="$CURRENT_VERSION_CODE"
    else
        SELECTED_VERSION_CODE="$new_code"
    fi
    
    print_success "选择版本代码: ${SELECTED_VERSION_CODE}"
}

# 用户选择平台
select_platform() {
    # 如果命令行参数已指定，直接使用
    if [ -n "$ARG_PLATFORM" ]; then
        SELECTED_PLATFORM="$ARG_PLATFORM"
        print_info "使用命令行参数: 平台=${SELECTED_PLATFORM}"
        return
    fi
    
    print_header "选择打包平台"
    echo "1) Android"
    echo "2) iOS"
    echo ""
    read -p "请选择 [1-2]: " choice
    
    case $choice in
        1) SELECTED_PLATFORM="android" ;;
        2) SELECTED_PLATFORM="ios" ;;
        *) print_error "无效选择，默认使用 Android"; SELECTED_PLATFORM="android" ;;
    esac
    
    print_success "选择平台: ${SELECTED_PLATFORM}"
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
    
    print_header "选择安卓架构兼容性"
    echo "1) 32/64位兼容包 (armeabi-v7a, arm64-v8a)"
    echo "2) 仅64位包 (arm64-v8a)"
    echo "当前: ${CURRENT_ABI_FILTERS}"
    echo ""
    read -p "请选择 [1-2] (留空保持当前): " choice
    
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

# 用户选择 Android 包名
select_android_package_name() {
    # 如果命令行参数已指定，直接使用
    if [ -n "$ARG_PACKAGE_NAME" ]; then
        PACKAGE_NAME="$ARG_PACKAGE_NAME"
        print_info "使用命令行参数: 包名=${PACKAGE_NAME}"
        return
    fi
    
    print_header "选择 Android 包名"
    echo "当前包名: ${BUNDLE_NAME}"
    read -p "输入新包名 (留空保持当前): " new_package_name
    
    if [ -z "$new_package_name" ]; then
        PACKAGE_NAME="$BUNDLE_NAME"
    else
        PACKAGE_NAME="$new_package_name"
    fi
    
    print_success "选择包名: ${PACKAGE_NAME}"
}

# 用户选择 Android 打包格式
select_android_format() {
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
    
    print_header "选择 Android 打包格式"
    echo "1) APK - 标准安装包"
    echo "2) AAB - Google Play 专用格式"
    echo ""
    read -p "请选择 [1-2] (默认 APK): " choice
    
    case $choice in
        1) SELECTED_ANDROID_FORMAT="apk" ;;
        2) SELECTED_ANDROID_FORMAT="aab" ;;
        "") SELECTED_ANDROID_FORMAT="apk" ;;
        *) print_error "无效选择，使用 APK"; SELECTED_ANDROID_FORMAT="apk" ;;
    esac
    
    print_success "选择打包格式: ${SELECTED_ANDROID_FORMAT}"
}

# 用户选择 iOS 区域版本
select_ios_region() {
    # 如果命令行参数已指定 Bundle ID，直接使用
    if [ -n "$ARG_IOS_BUNDLE_ID" ]; then
        IOS_BUNDLE_ID="$ARG_IOS_BUNDLE_ID"
        SELECTED_IOS_REGION="${ARG_IOS_REGION:-cn}"
        print_info "使用命令行参数: Bundle ID=${IOS_BUNDLE_ID}"
        return
    fi
    
    # 如果指定了区域但没有指定 Bundle ID
    if [ -n "$ARG_IOS_REGION" ]; then
        SELECTED_IOS_REGION="$ARG_IOS_REGION"
        if [ "$ARG_IOS_REGION" == "cn" ]; then
            IOS_BUNDLE_ID="$BUNDLE_NAME"
            print_info "使用命令行参数: 区域=${SELECTED_IOS_REGION}, Bundle ID=${IOS_BUNDLE_ID}"
            return
        fi
        # 海外版需要交互输入 Bundle ID
    fi
    
    print_header "选择 iOS 版本类型"
    echo "1) 国内版 - 使用默认包名 (${BUNDLE_NAME})"
    echo "2) 海外版 - 需要输入自定义包名"
    echo ""
    read -p "请选择 [1-2]: " choice
    
    case $choice in
        1) 
            SELECTED_IOS_REGION="cn"
            IOS_BUNDLE_ID="$BUNDLE_NAME"
            print_success "选择国内版，Bundle ID: ${IOS_BUNDLE_ID}"
            ;;
        2) 
            SELECTED_IOS_REGION="intl"
            echo ""
            echo "请输入海外版 Bundle ID（如 com.example.app.global）"
            read -p "Bundle ID: " custom_bundle_id
            
            if [ -z "$custom_bundle_id" ]; then
                print_warning "未输入 Bundle ID，使用默认值"
                IOS_BUNDLE_ID="$BUNDLE_NAME"
            else
                IOS_BUNDLE_ID="$custom_bundle_id"
            fi
            print_success "选择海外版，Bundle ID: ${IOS_BUNDLE_ID}"
            ;;
        *) 
            print_error "无效选择，使用国内版"
            SELECTED_IOS_REGION="cn"
            IOS_BUNDLE_ID="$BUNDLE_NAME"
            ;;
    esac
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
    
    print_header "配置 iOS 证书"
    
    print_info "iOS 打包需要以下文件："
    echo "  - 证书文件 (.p12)"
    echo "  - 描述文件 (.mobileprovision)"
    echo "  - 证书私钥密码"
    echo ""
    
    # 描述文件路径
    while true; do
        read -p "描述文件路径 (.mobileprovision): " profile_file
        profile_file="${profile_file/#\~/$HOME}"  # 展开 ~
        
        if [ -z "$profile_file" ]; then
            print_error "描述文件路径不能为空"
            continue
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
        read -p "证书文件路径 (.p12): " cert_file
        cert_file="${cert_file/#\~/$HOME}"  # 展开 ~
        
        if [ -z "$cert_file" ]; then
            print_error "证书文件路径不能为空"
            continue
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

# 更新 .env 文件
update_env_file() {
    if [ "$SELECTED_EDITION" != "$CURRENT_EDITION" ]; then
        print_info "更新 .env 文件..."
        sed -i.bak "s/^VITE_APP_EDITION=.*/VITE_APP_EDITION=${SELECTED_EDITION}/" "$ENV_FILE"
        rm -f "${ENV_FILE}.bak"
        print_success "已更新 VITE_APP_EDITION=${SELECTED_EDITION}"
    fi
}

# 更新 manifest.json 文件
update_manifest_file() {
    print_info "更新 manifest.json 文件..."
    
    # 根据平台决定是否更新 abiFilters
    local update_abi="false"
    local abi_filters='["armeabi-v7a", "arm64-v8a"]'
    
    if [ "$SELECTED_PLATFORM" == "android" ] && [ -n "$SELECTED_ABI_FILTERS" ]; then
        update_abi="true"
        abi_filters="$SELECTED_ABI_FILTERS"
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

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
console.log('manifest.json 更新成功');
EOF
    
    print_success "已更新 manifest.json"
    print_info "  - versionName: ${SELECTED_VERSION}"
    print_info "  - versionCode: ${SELECTED_VERSION_CODE}"
    if [ "$SELECTED_PLATFORM" == "android" ]; then
        print_info "  - abiFilters: ${SELECTED_ABI_FILTERS}"
    fi
}

# 显示打包配置摘要
show_summary() {
    print_header "打包配置摘要"
    echo -e "版本类型:      ${YELLOW}${SELECTED_EDITION}${NC}"
    echo -e "版本号:        ${YELLOW}${SELECTED_VERSION}${NC}"
    echo -e "版本代码:      ${YELLOW}${SELECTED_VERSION_CODE}${NC}"
    echo -e "打包平台:      ${YELLOW}${SELECTED_PLATFORM}${NC}"
    
    if [ "$SELECTED_PLATFORM" == "android" ]; then
        echo -e "包名:          ${YELLOW}${PACKAGE_NAME}${NC}"
        echo -e "架构:          ${YELLOW}${SELECTED_ABI_FILTERS}${NC}"
        echo -e "打包格式:      ${YELLOW}${SELECTED_ANDROID_FORMAT}${NC}"
    else
        echo -e "Bundle ID:     ${YELLOW}${IOS_BUNDLE_ID}${NC}"
        echo -e "区域版本:      ${YELLOW}${SELECTED_IOS_REGION}${NC}"
        echo -e "证书文件:      ${YELLOW}${IOS_CERT_FILE}${NC}"
        echo -e "描述文件:      ${YELLOW}${IOS_PROFILE_FILE}${NC}"
    fi
    
    echo ""
    
    # 如果使用 -y 参数，跳过确认
    if [ "$ARG_YES" = true ]; then
        print_info "使用 -y 参数，跳过确认"
        return
    fi
    
    read -p "确认开始打包? [y/N]: " confirm
    
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
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                              📦 打包成功！                                      ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════════╝${NC}"
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
    fi
}

# 执行云打包
execute_pack() {
    print_header "开始云打包"
    
    # 创建临时文件保存输出
    local temp_output=$(mktemp)
    local pack_cmd=""
    
    if [ "$SELECTED_PLATFORM" == "android" ]; then
        # Android 打包
        print_info "执行 Android 云打包..."
        print_info "打包格式: ${SELECTED_ANDROID_FORMAT}"
        
        # 使用 expect 处理交互提示
        print_info "正在启动打包任务 (已配置自动处理交互提示)..."
        
        if [ "$SELECTED_ANDROID_FORMAT" == "aab" ]; then
            print_info "使用 Google Play 渠道生成 AAB 格式"
            expect <<EOF | tee "$temp_output"
set timeout -1
spawn "$CLI_PATH" pack --project "$PROJECT_PATH" --platform android --android.packagename "$PACKAGE_NAME" --android.androidpacktype 3 --android.channels google --safemode false
expect {
    "是否继续提交" {
        send "y\r"
        exp_continue
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
        send "y\r"
        exp_continue
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
        send "y\r"
        exp_continue
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
    
    if [ $exit_code -eq 0 ]; then
        # 提取并显示下载链接
        extract_download_link "$(cat "$temp_output")"
        
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
    print_header "uni-app 云打包工具"
    
    # 检查环境
    check_cli
    check_config_files
    
    # 读取当前配置
    read_current_config
    
    # 用户交互选择
    select_edition
    select_version
    select_version_code
    select_platform
    
    # Android 特定配置
    if [ "$SELECTED_PLATFORM" == "android" ]; then
        select_android_abi
        select_android_package_name
        select_android_format
    fi
    
    # iOS 特定配置
    if [ "$SELECTED_PLATFORM" == "ios" ]; then
        select_ios_region
        configure_ios_certificate
    fi
    
    # 显示摘要并确认
    show_summary
    
    # 更新配置文件
    update_env_file
    update_manifest_file
    
    # 执行打包
    execute_pack
    
    print_header "打包完成"
}

# 运行主流程
parse_args "$@"
main
