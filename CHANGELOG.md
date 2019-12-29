## 0.2.0 (yyyy-mm-dd)
### Breaking changes
- `initData` is now optional and `fresh` is removed from config
- `#fetch()` can now be rejected if fetcher failed

### Features
- Totally redesigned the internal code

### Bug fixes
- Fixed cache is possibly expired but not marked so if `#expire()` is called while there is an ongoing fetch

## 0.1.0 (2019-11-29)
- First release
