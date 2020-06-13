## 0.3.0 (yyyy-mm-dd)
### Features
- Add `#getCurrentState()` and `#unasfeGet()`

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
