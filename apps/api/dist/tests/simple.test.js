"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)('Simple Test', () => {
    (0, vitest_1.it)('should pass', () => {
        (0, vitest_1.expect)(1 + 1).toBe(2);
    });
});
