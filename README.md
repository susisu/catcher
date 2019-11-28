# @susisu/catcher

[![Build Status](https://travis-ci.com/susisu/catcher.svg?branch=master)](https://travis-ci.com/susisu/catcher)

``` shell
npm i @susisu/catcher
# or
yarn add @susisu/catcher
```

## Usage

``` typescript
import { Catcher } from "@susisu/catcher";

const catcher = new Catcher<{ list: string[] }>({
  initData: { list: [] },
  fetcher : () => fetchFromSource(params),
});

// data1 = data fetched from the source
const data1 = await catcher.fetch();

// data2 = cached data equal to data1
const data2 = await catcher.fetch();

// expire the cache
catcher.expire();

// data3 = refetched data from the source
const data3 = await catcher.fetch();
```

## License

[MIT License](http://opensource.org/licenses/mit-license.php)

## Author

Susisu ([GitHub](https://github.com/susisu), [Twitter](https://twitter.com/susisu2413))
