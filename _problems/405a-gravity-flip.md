---
# generated: build_problems.py
pid: "405A"
title: "405A Gravity Flip"
---
{% raw %}
## My notes

n columns of blocks; gravity flips to pull everything to the RIGHT. Print the new heights.

Key insight: the heights stay the same, only their ORDER changes.

Gravity pulls right, so the shortest columns end up on the left and the tallest on the right, which means the answer is just the heights SORTED (smallest to largest).

Pattern: create the vector OUTSIDE the loops (used by the fill, sort and print).

Fill: read each height into x, then height.push_back(x).

`std::sort(height.begin(), height.end());`

Print: height[j], with a space after every item except the last (j != height.size() - 1).

Lesson: sometimes a "simulation" is just a sort in disguise.

Complexity: O(n log n), because of the sort

## Code

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

int main(){

    int n;
    std::cin >> n;

    std::vector<int> height;


    for(int i=0; i < n; i++){

        int x{};
        std::cin >> x;

        height.push_back(x);
    }


    std::sort(height.begin(), height.end());


    for(int j=0; j < n; j++){
        std::cout << height [j];
        if ( j != height.size() - 1){
            std::cout << ' ';
        }

    }



    return 0;
}
```

{% endraw %}
