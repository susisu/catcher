## 0.5.0 (2021-07-23)
### Breaking changes
- Drop Node.js 10 support

### Features
- Add explicit `| undefined` on optional properties in preparation for `--exactOptionalPropertyTypes` in TS 4.4
- Export `Config` and `StateType` types

## 0.4.0 (2020-06-20)
### Features
- Add `ttl` option to expire cache after specified duration
- Add `refetch` option to `#expire()` to control whether to discard ongoing fetch

## 0.3.0 (2020-06-13)
### Features
- Add `#getCurrentState()` and `#unsafeGet()`

## 0.2.1 (2020-04-13)
- Published internal module as [@susisu/promise-utils](https://github.com/susisu/promise-utils)

## 0.2.0 (2019-12-29)
### Breaking changes
- `initData` is now optional and `fresh` is removed from config
- `#fetch()` can now be rejected if fetcher failed

### Features
- Totally redesigned the internal code

### Bug fixes
- Fixed cache is possibly expired but not marked so if `#expire()` is called while there is an ongoing fetch

## 0.1.0 (2019-11-29)
- First release
