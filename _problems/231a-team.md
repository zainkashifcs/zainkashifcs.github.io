---
# generated: build_problems.py
pid: "231A"
title: "231A Team"
---
{% raw %}
## My notes

n problems; for each one, 3 friends say 1 (sure) or 0 (not sure).

The team solves it if AT LEAST 2 are sure, i.e. p + v + t >= 2.

The loop runs exactly n times, once per problem (like marking a pile of papers).

Each trip: READ that problem's 3 numbers, ADD them, CHECK >= 2, count++ if so.

Reading goes INSIDE the loop because every problem has its own data.

Print count ONCE, after the loop: we only want the final tally.

Complexity: O(n)

## Code

```cpp
#include <iostream>

int main(){



    int n {};
    std:: cin >> n;
    int count {};

    int p {};
    int v {};
    int t {};
    int total {};

    for(int i = 0; i < n; i++){
    
    std::cin >> p;
    std::cin >> v;
    std::cin >> t;
    total = p + v + t;

        if(total>=2){
            count = count + 1;

        }

    }
    std::cout << count;
    return 0;
}
```

{% endraw %}
