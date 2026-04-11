import test from "node:test";
import assert from "node:assert/strict";

import { parseWindowsNetstatPid, parseWindowsTasklistAlive } from "../src/shared/process.mjs";

test("parseWindowsNetstatPid extracts listener pid from IPv4 output", () => {
  const output = `
Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:18123          0.0.0.0:0              LISTENING       20908
  TCP    127.0.0.1:18123        127.0.0.1:52000        ESTABLISHED     20908
`;

  assert.equal(parseWindowsNetstatPid(output, 18123), 20908);
});

test("parseWindowsNetstatPid extracts listener pid from IPv6 output", () => {
  const output = `
  TCP    [::]:26173             [::]:0                 LISTENING       38416
`;

  assert.equal(parseWindowsNetstatPid(output, 26173), 38416);
});

test("parseWindowsNetstatPid ignores non-listener rows", () => {
  const output = `
  TCP    127.0.0.1:18123        127.0.0.1:52000        ESTABLISHED     20908
`;

  assert.equal(parseWindowsNetstatPid(output, 18123), 0);
});

test("parseWindowsTasklistAlive returns true when tasklist includes the expected pid", () => {
  const output = `
backend-dev.exe              10492 Console                    1     56,888 K
`;

  assert.equal(parseWindowsTasklistAlive(output, 10492), true);
});

test("parseWindowsTasklistAlive returns false for localized no-task output", () => {
  const output = "��Ϣ: û�����е�����ƥ��ָ����׼��\r\n";

  assert.equal(parseWindowsTasklistAlive(output, 30604), false);
});
