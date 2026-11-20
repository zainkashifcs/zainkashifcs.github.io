---
# generated: build_problems.py
pid: "1790D"
title: "1790D Matryoshkas"
---
{% raw %}
## My notes

Split the dolls into the FEWEST sets, where each set is CONSECUTIVE sizes (no gaps, one of each size).

Max frequency is only a LOWER BOUND: gaps force extra sets ([1, 3] needs 2, not 1).

Go through the sizes in INCREASING order. Sets ending at x - 1 can be extended by a doll of size x.

New sets starting at x = max(0, cnt[x] - cnt[x - 1]); the answer is the sum over all sizes.

A missing size counts as 0, so gaps are handled automatically.

map<int, int> cnt: counts each size, with keys SORTED, so looping visits the sizes in order.

Check cnt.count(x - 1) BEFORE reading cnt[x - 1]; otherwise you'd insert into the map mid-loop.

Lesson: TRY TO BREAK your hypothesis with a tiny counterexample before coding it.

Complexity: O(n log n) time (map operations over the sum of n), O(n) space.

## Code

```cpp
#include <iostream>
#include <map>
#include <algorithm>

int main()
{
    int t{};
    std::cin >> t;

    for (int i = 0; i < t; i++)
    {
        int n{};
        std::cin >> n;

        std::map<int, int> cnt{};

        for (int j = 0; j < n; j++)
        {
            int x{};
            std::cin >> x;

            cnt[x]++;
        }

        int ans{};

        for (auto entry : cnt)
        {
            int x = entry.first;
            int current = entry.second;
            int previous{};

            if (cnt.count(x - 1))
            {
                previous = cnt[x - 1];
            }

            ans += std::max(0, current - previous);
        }

        std::cout << ans << '\n';
    }

    return 0;
}
```

{% endraw %}
