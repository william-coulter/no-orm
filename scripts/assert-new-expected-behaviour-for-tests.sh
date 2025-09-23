#!/usr/bin/env bash
set -euo pipefail

# -------------------------------------------------------------------
# This script is used when the behaviour of the application changes
# and the "expected" outputs of the tests need to be updated.
#
# It iterates through all `tests/test-*` directories, removes the
# existing `expected` directory, and replaces it with a fresh copy
# of the corresponding `test-outputs` directory.
#
# Use this script when you have intentionally changed the application 
# application behaviour and you want the new outputs to become the new
# "expected" baseline for your tests. You might have to manually edit
# the test file to remove assertions.
#
# Example usage:
#   ./scripts/assert-new-expected-behaviour-for-tests.sh
# -------------------------------------------------------------------


SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

for test_dir in "$ROOT_DIR"/tests/test-*; do
    if [ -d "$test_dir" ]; then
        expected_dir="$test_dir/expected"
        outputs_dir="$test_dir/test-outputs"

        if [ -d "$outputs_dir" ]; then
            echo "Updating expected files in: $test_dir"

            rm -rf "$expected_dir"

            cp -r "$outputs_dir" "$expected_dir"
        else
            echo "⚠️  Skipping $test_dir (no test-outputs directory found)"
        fi
    fi
done

echo "✅ All expected directories replaced with test-outputs."
