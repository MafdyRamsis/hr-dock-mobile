// The App Store has two HR Dock listings built from this one codebase:
//
//   default (APP_VARIANT unset)   com.hrdock.mobile  unlisted listing, shared
//                                 by link with client companies' employees
//   APP_VARIANT=public            com.hrdock.app     searchable listing; anyone
//                                 can open the read-only demo workspace
//
// Apple can't switch an approved app from unlisted to public, so the public
// listing needs its own bundle ID. Android stays a single app.
module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'public') return config
  return {
    ...config,
    ios: { ...config.ios, bundleIdentifier: 'com.hrdock.app' },
  }
}
