#!/usr/bin/env bash
set -euo pipefail

PACKAGE="com.ffmfmelet.frfjrje"
OUTPUT_DIR=""
NO_CLEAR=0
DEVICE_SERIAL=""

usage() {
    cat <<'EOF'
Usage: capture-android-logs.sh [options]

Options:
  -p, --package <name>   Android package name (default: com.ffmfmelet.frfjrje)
  -o, --output <dir>     Output directory (default: <project>/logs)
  -s, --serial <id>      ADB device serial (optional)
      --no-clear         Do not clear logcat buffer before recording
  -h, --help             Show this help
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -p|--package)
            PACKAGE="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -s|--serial)
            DEVICE_SERIAL="$2"
            shift 2
            ;;
        --no-clear)
            NO_CLEAR=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

find_adb() {
    if command -v adb >/dev/null 2>&1; then
        command -v adb
        return 0
    fi

    local candidates=(
        "$HOME/Library/Android/sdk/platform-tools/adb"
        "$HOME/Android/Sdk/platform-tools/adb"
        "/usr/local/share/android-sdk/platform-tools/adb"
        "/opt/homebrew/share/android-sdk/platform-tools/adb"
    )

    for path in "${candidates[@]}"; do
        if [[ -x "$path" ]]; then
            echo "$path"
            return 0
        fi
    done

    echo "adb not found. Install Android Platform-Tools:" >&2
    echo "  brew install android-platform-tools" >&2
    echo "or install Android Studio SDK." >&2
    exit 1
}

adb_cmd() {
  if [[ -n "$DEVICE_SERIAL" ]]; then
    "$ADB" -s "$DEVICE_SERIAL" "$@"
  else
    "$ADB" "$@"
  fi
}

get_connected_devices() {
    adb_cmd devices | awk 'NR > 1 && $2 == "device" { print $1 }'
}

get_package_uid() {
    local line
  line="$(adb_cmd shell pm list packages -U "$PACKAGE" | tr -d '\r' | grep "^package:$PACKAGE " || true)"
    if [[ "$line" =~ uid:([0-9]+) ]]; then
        echo "${BASH_REMATCH[1]}"
    fi
}

get_package_pid() {
    local pid
    pid="$(adb_cmd shell pidof -s "$PACKAGE" 2>/dev/null | tr -d '\r' || true)"
    if [[ "$pid" =~ ^[0-9]+$ ]]; then
        echo "$pid"
    fi
}

wait_for_package_pid() {
    local timeout="${1:-120}"
    local i=0
    while [[ "$i" -lt "$timeout" ]]; do
        local pid
        pid="$(get_package_pid || true)"
        if [[ -n "$pid" ]]; then
            echo "$pid"
            return 0
        fi
        sleep 1
        i=$((i + 1))
    done
    return 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ADB="$(find_adb)"

if [[ -z "$DEVICE_SERIAL" ]]; then
    mapfile -t DEVICES < <(get_connected_devices)
    if [[ "${#DEVICES[@]}" -eq 0 ]]; then
        echo "No authorized Android device found. Run 'adb devices' and allow USB debugging on the phone." >&2
        exit 1
    fi
    if [[ "${#DEVICES[@]}" -gt 1 ]]; then
        DEVICE_SERIAL="${DEVICES[0]}"
        echo "Warning: multiple devices detected, using the first one: $DEVICE_SERIAL" >&2
    fi
fi

if [[ -z "$OUTPUT_DIR" ]]; then
    OUTPUT_DIR="$PROJECT_ROOT/logs"
fi

mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
LOG_FILE="$OUTPUT_DIR/$PACKAGE-$TIMESTAMP.log"

echo ""
echo "Package : $PACKAGE"
echo "ADB     : $ADB"
echo "Output  : $LOG_FILE"
echo ""

if [[ "$NO_CLEAR" -eq 0 ]]; then
    echo "Clearing old logcat buffer..."
    adb_cmd logcat -c
fi

UID="$(get_package_uid || true)"
PID="$(get_package_pid || true)"

if [[ -z "$PID" ]]; then
    echo "App is not running yet."
    echo "Open the app on the phone now..."
    PID="$(wait_for_package_pid 120 || true)"
fi

if [[ -z "$PID" ]]; then
    echo "Could not find running process for $PACKAGE. Start the app on the phone and run the script again." >&2
    exit 1
fi

echo "Process PID: $PID"
if [[ -n "$UID" ]]; then
    echo "Package UID: $UID"
fi

echo ""
echo "Recording logs. Press Ctrl+C to stop."
echo ""

cleanup() {
    echo ""
    echo "Saved to: $LOG_FILE"
}

trap cleanup EXIT

if [[ -n "$UID" ]]; then
    adb_cmd logcat -v threadtime "--uid=$UID" | tee "$LOG_FILE"
else
    echo "Warning: UID not found, falling back to PID filter." >&2
    adb_cmd logcat -v threadtime "--pid=$PID" | tee "$LOG_FILE"
fi
