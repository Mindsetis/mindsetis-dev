/**
 * Username of the fully filled-out "example" Mindsetter profile that `UpgradeProfileWidget`'s
 * "See Example" link points a Member at — Release-1 C8. The client promised (2026-09-20) to build
 * this profile out herself; it doesn't exist yet, so this constant starts EMPTY on purpose.
 *
 * The widget checks this value and renders NO "See Example" link at all while it's blank — no
 * dead link, no placeholder profile, nothing to click. Once the client's example profile is ready,
 * set this to that account's `profiles.username` and the link turns on with no other code change.
 */
export const EXAMPLE_MINDSETTER_PROFILE_USERNAME = '';
