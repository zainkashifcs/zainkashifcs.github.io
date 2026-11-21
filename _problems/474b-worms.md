---
# generated: build_problems.py
pid: "474B"
title: "474B Worms"
---
{% raw %}
## My notes

Problem: 474B Worms

Link: https://codeforces.com/problemset/problem/474/B

Tags: binary search, implementation Idea: Piles of worms are numbered in order. For each worm label, which pile is it in?

Build prefix sums: pre[i] = total worms in piles 0..i.

The answer is the first pile whose running total reaches q -> lower_bound on pre.

Complexity: O(n + m log n) time, O(n) space.

Lesson: Prefix sums turn "which range is this in?" into a sorted array you can binary search.

lower_bound returns the first element >= q, which is exactly the pile we want.

## Code

```cpp
#include <bits/stdc++.h>

int main(){
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int n;
    std::cin >> n;
    std::vector<int> pre(n);
    for(int i = 0; i < n; i++){
        int a;
        std::cin >> a;
        pre[i] = a + (i ? pre[i-1] : 0);
    }

    int m;
    std::cin >> m;
    while(m--){
        int q;
        std::cin >> q;
        // first pile whose running total reaches q
        std::cout << (std::lower_bound(pre.begin(), pre.end(), q) - pre.begin()) + 1 << '\n';
    }
}
```

{% endraw %}
