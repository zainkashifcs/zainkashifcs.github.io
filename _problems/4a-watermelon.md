---
# generated: build_problems.py
pid: "4A"
title: "4A Watermelon"
---
{% raw %}
## My notes

Insight: even + even = even, so w must be even.

Edge case: w = 2 fails (1+1 or 2+0), so w > 2.

Complexity: O(1)

## Code

```cpp
#include <iostream>

int main() {
int w;
std::cin >> w;

if(w % 2 == 0 && w > 2){
    std::cout << "YES";
} 

else{
    std::cout << "NO";
}

return 0;

}
```

{% endraw %}
