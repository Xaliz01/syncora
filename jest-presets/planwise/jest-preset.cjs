const path = require("path");

/** @type {import("jest").Config} */
module.exports = {
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  moduleNameMapper: {
    "^@planwise/shared/nest$": path.join(__dirname, "../../packages/shared/src/nest.ts"),
    "^@planwise/shared$": path.join(__dirname, "../../packages/shared/src/index.ts")
  }
};
