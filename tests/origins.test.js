import assert from "node:assert/strict";
import test from "node:test";
import { createAllowedOrigins, isOriginAllowed } from "../apps/api/src/utils/origins.js";

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

test("isOriginAllowed permits unpacked chrome extension origins outside production", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";

  try {
    assert.equal(
      isOriginAllowed("chrome-extension://temporaryunpackedextensionid", [
        "https://liveimpact.example.com"
      ]),
      true
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
});

test("isOriginAllowed still blocks unknown chrome extension origins in production", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    assert.equal(
      isOriginAllowed("chrome-extension://temporaryunpackedextensionid", [
        "https://liveimpact.example.com"
      ]),
      false
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
});
