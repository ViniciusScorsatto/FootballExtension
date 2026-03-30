import assert from "node:assert/strict";
import test from "node:test";
import { createAllowedOrigins, isOriginAllowed } from "../backend/src/utils/origins.js";

test("createAllowedOrigins includes explicit origins and chrome extension origins", () => {
  const allowedOrigins = createAllowedOrigins({
    allowedOrigins: ["https://liveimpact.example.com"],
    allowedExtensionIds: ["abcdefghijklmnopabcdefghijklmnop"]
  });

  assert.deepEqual(allowedOrigins, [
    "https://liveimpact.example.com",
    "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
  ]);
});

test("isOriginAllowed permits empty origins and explicit matches", () => {
  const allowedOrigins = [
    "https://liveimpact.example.com",
    "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
  ];

  assert.equal(isOriginAllowed(undefined, allowedOrigins), true);
  assert.equal(isOriginAllowed("https://liveimpact.example.com", allowedOrigins), true);
  assert.equal(
    isOriginAllowed("chrome-extension://abcdefghijklmnopabcdefghijklmnop", allowedOrigins),
    true
  );
  assert.equal(isOriginAllowed("https://evil.example.com", allowedOrigins), false);
});
