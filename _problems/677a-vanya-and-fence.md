---
# generated: build_problems.py
pid: "677A"
title: "677A Vanya and Fence"
---
{% raw %}
## My notes

n friends walk in a row next to a fence of height h.

If a friend is taller than the fence (a > h), they bend down and take up 2 width.

Otherwise they take up 1 width.

Pattern: read n and h, then read each friend's height a INSIDE the loop.

width is a running total starting at 0: width += 2 or width += 1.

Print width ONCE, after the loop.

Complexity: O(n)

## Code

```cpp
#include <iostream>

int main (){
    int n {};
    std::cin >> n;

    int h {};
    std::cin >> h;

    int width {0};

    for(int i = 0; i < n; i++){

        int a{};
        std::cin >> a;
        if(a > h){
            width = width + 2;
            
        }

        else{

            width = width + 1;
        }

    }
    std::cout << width;
    return 0;
}
```

{% endraw %}
