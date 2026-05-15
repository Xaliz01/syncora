const path = require("path");

/** @type {import("jest").Config} */
module.exports = {
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  moduleNameMapper: {
    "^@syncora/shared$": path.join(__dirname, "../../packages/shared/src/index.ts")
  }
};
