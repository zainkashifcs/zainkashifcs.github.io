---
# generated: build_problems.py
pid: "1399A"
title: "1399A Remove Smallest"
---
{% raw %}
## My notes

t test cases; each has n numbers. You can remove the smaller of two numbers whose gap is <= 1.

Can you get down to ONE number? YES if EVERY neighbouring gap (after sorting) is <= 1.

Fill loop: read each number into x, then a.push_back(x). Loop with j < n (a is empty at the start!).

std::sort, so close numbers sit next to each other, then compare neighbours a[k] and a[k + 1].

The loop stops at k < a.size() - 1, because we look at a[k + 1].

BOOL FLAG: bool ok = true before the loop; if a gap > 1 appears, ok = false.

The decision goes AFTER the loop: ok → "YES", otherwise "NO".

Flags answer "is it true for ALL?" / "did it EVER happen?" Complexity: O(n log n) per test case, because of the sort

## Code

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

int main(){

    int t {};
    std::cin >> t;

    for(int i = 0; i < t; i++ ){

        int n {};
        std::cin >> n;

        std::vector<int> a;

        for(int j = 0; j < n; j++){

            int x{};
            std::cin >> x;

            a.push_back(x);
        }

        std::sort(a.begin(), a.end());
        bool ok = true;

        for(int k = 0; k < a.size() - 1; k++){
            if (a[k + 1] - a[k] >1){
                ok = false;
            }
        }

        if (ok){
            std::cout << "YES\n";
        } else{
            std::cout << "NO\n";
        }




    }




    return 0;
}
```

{% endraw %}
