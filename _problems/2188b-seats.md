---
# generated: build_problems.py
pid: "2188B"
title: "2188B Seats"
---
{% raw %}
## My notes

Binary string of length n (1 = occupied, 0 = empty, no adjacent 1s initially).

Place minimum extra 1s with no two adjacent 1s until no valid empty seats remain.

Pad a virtual '0' on both ends of the string so leading, trailing, and all-zero gaps behave like internal gaps.

Count initial 1s, and for each contiguous run of zeros of length len in the padded string, add len / 3.

Complexity: O(n) per test case, O(1) extra space.

## Code

```cpp
#include <iostream>
#include <string>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int t {};
    std::cin >> t;
    while (t--) {
        int n {};
        std::cin >> n;

        std::string s;
        std::cin >> s;

        int ans = 0;
        int zeros = 1;

        for (int i = 0; i < n; i++) {
            if (s[i] == '1') {
                ans++;
                ans += zeros / 3;
                zeros = 0;
            } else {
                zeros++;
            }
        }

        zeros++;
        ans += zeros / 3;

        std::cout << ans << '\n';
    }
}
```

{% endraw %}
