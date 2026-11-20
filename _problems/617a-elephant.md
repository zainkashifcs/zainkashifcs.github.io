---
# generated: build_problems.py
pid: "617A"
title: "617A Elephant"
---
{% raw %}
## My notes

The elephant moves 1-5 steps per move. Find the fewest moves to reach x.

x / 5 counts the full 5-step moves.

If x % 5 == 0, there's nothing left over, so the answer is x / 5.

Otherwise, the leftover (1, 2, 3 or 4 steps) can't make a full move, but it still takes ONE more move to cover, so the answer is x / 5 + 1.

Example: 12 = 5 + 5 + 2, so 2 full moves + 1 extra = 3 moves.

Complexity: O(1)

## Code

```cpp
#include <iostream>


int main(){

    int x {};
    std::cin >> x ;

    if(x % 5 == 0){
        std::cout << x / 5;
    }

    else{
        std::cout << (x / 5) + 1;
        
    }




    return 0;
}
```

{% endraw %}
