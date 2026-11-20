---
# generated: build_problems.py
pid: "451A"
title: "451A Game With Sticks"
---
{% raw %}
## My notes

n horizontal and m vertical sticks. Each move picks an intersection, removing ONE horizontal and ONE vertical stick.

The game lasts min(n, m) moves (until one direction runs out).

Found the smaller one with if (n < m) moves = n; else moves = m; (no <algorithm>)

Akshat moves first (moves 1, 3, 5...), so whoever makes the LAST move wins:

moves is odd → "Akshat", even → "Malvika" No loop needed: it's an ad hoc observation plus parity (% 2).

Complexity: O(1)

## Code

```cpp
#include <iostream>

int main(){
    

    int n{};
    int m{};
    int moves {};

    std::cin >> n;
    std::cin >> m;

    if ( n < m){

        moves = n;
    }
    else{
        moves = m;
    }

    if( moves % 2 == 0){

        std::cout << "Malvika";
    }

    else{
        std::cout << "Akshat";
    }

}
```

{% endraw %}
