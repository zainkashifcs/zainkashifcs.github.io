---
# generated: build_problems.py
pid: "467A"
title: "467A George and Accommodation"
---
{% raw %}
## My notes

n rooms: p = people already living there, q = room capacity.

George and Alex want to move in TOGETHER, so a room needs 2+ free spaces.

Free spaces = q - p (capacity minus people already in it).

Pattern: read n, then read p and q INSIDE the loop, once per room.

If q - p >= 2, count++ (the count pattern, like 231A Team).

Print count ONCE, after the loop.

Complexity: O(n)

## Code

```cpp
#include <iostream>

int main (){

    int n{};
    std::cin >> n;
    int total {};
    int count {};

    for(int i = 0; i < n; i++){

        int p{};
        int q{};

        std::cin >> p;
        std::cin >> q;

        total = q - p;

        if(total >= 2){
            count=count + 1;
    
        }
    }

    std::cout << count;
    return 0;
}
```

{% endraw %}
