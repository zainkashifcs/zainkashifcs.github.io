---
# generated: build_problems.py
pid: "706B"
title: "706B Interesting drink"
---
{% raw %}
## My notes

n shop prices, q days with m coins each: how many shops can you afford each day?

Brute force O(n*q) = 1e10, which is TLE.

SORT once, then BINARY SEARCH for the first index with price > m: that index IS the count.

search(): lo = 0, hi = n, while (lo < hi); a[mid] <= x → lo = mid + 1, else hi = mid

(mid might be the answer, so keep it). Counterexample for mid - 1: [1, 10], x = 5.

The same as std::upper_bound(begin, end, m) - begin.

Complexity: O(n log n + q log n)

## Code

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

int search(const std::vector<int>& a, int x){


    int lo {};
    int hi = static_cast<int>(a.size());

    while( lo < hi){
        int mid = lo + (hi - lo) /2;

        if(a[mid] <= x){

            lo = mid + 1;
        }
        else if (a[mid] > x){

            hi = mid;
        }
    }

    return lo;
}

int main(){

    int n {};
    std::cin >> n;

    std::vector<int>prices(n);

    for(int i = 0; i<n; i++){

        std::cin >> prices[i];
    }

    std::sort(prices.begin(), prices.end());

    int q {};
    std::cin >> q;

    for(int j = 0; j < q; j++){
        
        int m{};
        std::cin >> m;
        std::cout << search(prices, m) << '\n';
    }

    return 0;
}
```

{% endraw %}
