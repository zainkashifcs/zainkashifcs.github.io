---
title: "492B Vanya and Lanterns"
link: "https://codeforces.com/problemset/problem/492/B"
tags: ["sorting", "greedy", "maths"]
solution: "CF Questions/492B_Vanya_And_Lanterns.cpp"
---
{% raw %}
## Idea

Sort the lanterns. The street ends are lit from one side only, gaps from both sides,

so d = max(a[0], l - a[n-1], every gap / 2). Several lower bounds -> the answer is their max.

Complexity: O(n log n) time, O(n) space.

## Lesson

std::max / std::max({...}) need every argument to be the same type (cast first).

Decimal output needs fixed + setprecision from <iomanip>.

Redo 24 Nov: assisted (looked up the type handling), ~19 min.

## Code

```cpp
#include <algorithm>
#include <iomanip>
#include <iostream>
#include <vector>

int main() {
    int n;
    long long l;
    std::cin >> n >> l;

    std::vector<long long> a(n);
    for (int i = 0; i < n; i++) {
        std::cin >> a[i];
    }   

    std::sort(a.begin(), a.end());

    long long maxGap = 0;
    for (int i = 1; i < n; i++) {
        maxGap = std::max(maxGap, a[i] - a[i - 1]);
    }

    double d = std::max({(double)a[0], (double)(l - a[n - 1]), maxGap / 2.0});

    std::cout << std::fixed << std::setprecision(10) << d << '\n';

    return 0;
}
```
{% endraw %}
