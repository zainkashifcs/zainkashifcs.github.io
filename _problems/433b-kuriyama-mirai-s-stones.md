---
# generated: build_problems.py
pid: "433B"
title: "433B Kuriyama Mirai's Stones"
---
{% raw %}
## My notes

n stone costs, m queries of 2 types: sum of range [l, r] in original OR sorted order.

Brute force O(n*m) = 1e10, which is TLE.

Build PREFIX SUMS once for original v and sorted u, then answer each query in O(1).

pref[i] = sum of first i elements (1-indexed, pref[0] = 0); range [l, r] = pref[r] - pref[l - 1].

Use long long: max sum is 1e5 * 1e9 = 1e14, which overflows 32-bit int.

Complexity: O(n log n + m) Redo 24 Nov: independent, ~13 min (overflow arithmetic done before choosing types).

## Code

```cpp
#include <iostream>
#include <vector>
#include <algorithm>



int main() {

    int n {};
    std::cin >> n;

    std::vector<long long> a(n + 1);
    std::vector<long long> p1(n + 1, 0), p2(n + 1, 0);

    for (int i = 1; i <= n; i++) {
        std::cin >> a[i];
        p1[i] = p1[i - 1] + a[i];
    }

    std::sort(a.begin() + 1, a.end());
    for (int i = 1; i <= n; i++) {
        p2[i] = p2[i - 1] + a[i];
    }

    int m;
    std::cin >> m;
    while (m--) {
        int type, l, r;
        std::cin >> type >> l >> r;

        if (type == 1) {
            std::cout << p1[r] - p1[l - 1] << '\n';
        } else {
            std::cout << p2[r] - p2[l - 1] << '\n';
        }
    }
}
```

{% endraw %}
