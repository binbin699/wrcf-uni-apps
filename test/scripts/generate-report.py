#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from urllib.parse import quote


def duration_text(seconds: int) -> str:
    minutes, rest = divmod(max(seconds, 0), 60)
    if minutes:
        return f"{minutes}m {rest}s"
    return f"{rest}s"


def rel(path: str, base: Path) -> str:
    if not path:
        return ""
    try:
        return str(Path(path).relative_to(base))
    except ValueError:
        return path


def md_link(label: str, path: str, base: Path) -> str:
    if not path:
        return ""
    return f"[{label}]({quote(rel(path, base), safe='/')})"


def first_lines(path: str, limit: int = 12) -> list[str]:
    if not path or not Path(path).exists():
        return []
    lines = Path(path).read_text(encoding="utf-8", errors="replace").splitlines()
    return lines[:limit]


def status_icon(status: str) -> str:
    if status == "passed":
        return "PASS"
    if status == "blocked":
        return "BLOCKED"
    return "FAIL"


def table_cell(value: str) -> str:
    return value.replace("|", "\\|")


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: generate-report.py <report-data.json>", file=sys.stderr)
        return 2

    data_path = Path(sys.argv[1])
    data = json.loads(data_path.read_text(encoding="utf-8"))
    report_dir = data_path.parent
    run = data["run"]
    env = data["environment"]
    flows = data.get("flows", [])

    passed = [flow for flow in flows if flow["status"] == "passed"]
    blocked = [flow for flow in flows if flow["status"] == "blocked"]
    failed = [flow for flow in flows if flow["status"] == "failed"]
    total_duration = sum(flow.get("duration_seconds", 0) for flow in flows)

    out: list[str] = []
    out.append("# linx-app Maestro E2E Report")
    out.append("")
    out.append("## Result")
    out.append("")
    out.append(f"- Status: `{run['status']}`")
    out.append(f"- Flows: `{len(passed)}/{len(flows)} passed`")
    out.append(f"- Blocked: `{len(blocked)}`")
    out.append(f"- Failed: `{len(failed)}`")
    out.append(f"- Duration: `{duration_text(total_duration)}`")
    out.append(f"- Run ID: `{run['id']}`")
    out.append(f"- Git commit: `{run['git_commit']}`")
    out.append(f"- Started at: `{run['started_at']}`")
    out.append(f"- Finished at: `{run['finished_at']}`")

    if failed:
        failed_names = ", ".join(flow["name"] for flow in failed)
        out.append(f"- Failed flows: `{failed_names}`")

    out.append("")
    out.append("## Environment")
    out.append("")
    out.append(f"- Device: `{env.get('device_id', '')}`")
    out.append(f"- App package: `{env.get('app_package', '')}`")
    out.append(f"- Run to device: `{env.get('run_to_device', '')}`")
    out.append(f"- Flow targets: `{env.get('flow_targets', '')}`")
    out.append(f"- Test account: `{env.get('test_email', '')}`")
    out.append(f"- Has test device: `{env.get('has_test_device', '')}`")
    out.append(f"- Has test agent: `{env.get('has_test_agent', '')}`")
    out.append(f"- HBuilderX log: {md_link('hbuilderx-run.log', env.get('hbuilderx_run_log', ''), report_dir)}")
    out.append(f"- ADB forward log: {md_link('adb-forward.log', env.get('adb_forward_log', ''), report_dir)}")
    out.append(f"- Maestro log: {md_link('maestro.log', env.get('maestro_log', ''), report_dir)}")
    out.append(f"- Flow list: {md_link('flows.txt', env.get('flows_list', ''), report_dir)}")

    out.append("")
    out.append("## Flow Results")
    out.append("")
    out.append("| # | Domain | Flow | Status | Duration | Log | Artifact |")
    out.append("|---:|---|---|---|---:|---|---|")
    for index, flow in enumerate(flows, start=1):
        log_link = md_link("log", flow.get("log", ""), report_dir)
        artifact_link = md_link("artifact", flow.get("artifact_dir", ""), report_dir)
        out.append(
            "| {index} | `{domain}` | `{name}` | `{status}` | `{duration}` | {log} | {artifact} |".format(
                index=index,
                domain=table_cell(flow.get("domain", "")),
                name=table_cell(flow.get("name", "")),
                status=status_icon(flow.get("status", "")),
                duration=duration_text(flow.get("duration_seconds", 0)),
                log=log_link,
                artifact=artifact_link,
            )
        )

    out.append("")
    out.append("## Failure Details")
    out.append("")
    if not failed:
        out.append("No failed flows.")
    else:
        for flow in failed:
            out.append(f"### {flow['name']}")
            out.append("")
            out.append(f"- File: `{flow['file']}`")
            out.append(f"- Domain: `{flow['domain']}`")
            out.append(f"- Duration: `{duration_text(flow.get('duration_seconds', 0))}`")
            out.append(f"- Exit code: `{flow.get('exit_code', '')}`")
            if flow.get("error_summary"):
                out.append(f"- Error: `{flow['error_summary']}`")
            out.append(f"- Log: {md_link('flow log', flow.get('log', ''), report_dir)}")
            out.append(f"- Commands JSON: {md_link('commands', flow.get('commands_json', ''), report_dir)}")
            out.append(f"- AI report: {md_link('ai report', flow.get('ai_report', ''), report_dir)}")
            if flow.get("screenshots"):
                out.append("- Screenshots:")
                for screenshot in flow["screenshots"]:
                    out.append(f"  - {md_link(Path(screenshot).name, screenshot, report_dir)}")
            snippet = first_lines(flow.get("log", ""), 18)
            if snippet:
                out.append("")
                out.append("```text")
                out.extend(snippet)
                out.append("```")
            out.append("")

    out.append("")
    out.append("## Blocked Details")
    out.append("")
    if not blocked:
        out.append("No blocked flows.")
    else:
        for flow in blocked:
            out.append(f"### {flow['name']}")
            out.append("")
            out.append(f"- File: `{flow['file']}`")
            out.append(f"- Domain: `{flow['domain']}`")
            out.append(f"- Reason: `{flow.get('block_reason') or flow.get('error_summary', '')}`")
            out.append(f"- Log: {md_link('flow log', flow.get('log', ''), report_dir)}")
            out.append("")

    out.append("")
    out.append("## Attachments")
    out.append("")
    out.append(f"- Structured data: {md_link('report-data.json', str(data_path), report_dir)}")
    out.append(f"- Flow result records: {md_link('flow-results.jsonl', str(report_dir / 'flow-results.jsonl'), report_dir)}")
    out.append(f"- Rendered flows: {md_link('rendered/', str(report_dir / 'rendered'), report_dir)}")
    out.append(f"- Per-flow logs: {md_link('flows/', str(report_dir / 'flows'), report_dir)}")
    out.append(f"- Maestro artifacts: {md_link('maestro/', str(report_dir / 'maestro'), report_dir)}")

    print("\n".join(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
