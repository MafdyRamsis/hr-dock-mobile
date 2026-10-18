# Leadership device validation

Status: automated tests and platform exports passed; physical-device results are pending.

Use backend commit `091ee100b04858a1f309ae885a4ae1d9904024a4` in Railway staging, with migration 213 applied. Use synthetic tenant accounts only. Keep the existing payroll investigation data intact.

The `leadership-staging` EAS build profile targets `https://hr-dock-backend-staging.up.railway.app/api/v1` and uses its own update channel. The existing `preview` profile targets production and is unsuitable for this validation. Creating an internal build does not submit to either store. iOS internal distribution requires registered tester devices.

Run `eas build --profile leadership-staging --platform android` or `eas build --profile leadership-staging --platform ios` from the reviewed branch after staging is healthy. Record the commit, EAS build ID, platform, OS version and actual outcome for each scenario. These are preparation commands, not evidence of a completed build.

| Scenario | Expected result |
| --- | --- |
| Employee sign-in | Home, Attendance, Requests, Pay and More; own records only. |
| Manager sign-in | Overview, Team, Approvals, Performance and More; direct reports only. |
| CEO sign-in | Overview, Workforce, Payroll, Performance and More; company scope with own services in My Space. |
| Pulse navigation | Ask HR Dock and recognition are reachable under More. |
| Salary grant absent | Manager forecast is denied; no previous user's figures remain visible. |
| Totals-only grant | Team estimate is visible; names, individual salary rows and departmental subtotals are absent. |
| Individual grant | Only authorized team members appear. CEO cannot run payroll or administer users. |
| October cycle, start day 21 | Attendance and coverage show September 21 through October 20. On October 21, the default active month is November. |
| Forecast | Projected cycle-end net and estimated net earned to date are separate; cutoff, calculation time and incomplete-data warnings appear. |
| KPI health | Achieved, red flag, not achieved, not updated and on track remain distinct. Manager edits persist after refresh. |
| Assigned approval | Confirmed decision and note save; rejected/failed requests remain actionable and show errors. |
| Slow network and rapid navigation | Old roster/leave/salary data never appears under a different workspace, period or account. |
| Background/foreground | Leadership refreshes; loading and failures do not fabricate zero totals. |
| Arabic and English | Labels, dates, amounts, RTL layout and large text remain readable without clipping. |
| Access revocation | Hidden data clears immediately; API refuses further unauthorized reads. |

Do not mark physical validation complete from an export, a mocked interaction test or a CI result. Release backend before clients; do not publish a production OTA update from the staging profile.
