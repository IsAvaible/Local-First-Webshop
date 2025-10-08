export default {
  /*
   * Use the @commitlint/config-conventional config (see: https://www.conventionalcommits.org/en/v1.0.0/)
   */
  extends: ["@commitlint/config-conventional"],
  /*
   * Rules
   */
  rules: {
    // Disable the body-max-line-length rule
    "body-max-line-length": [0],
    // Disable the subject-case rule
    "subject-case": [0],
    // Forbid empty scopes
    "scope-empty": [2, "never"]
  }
};
