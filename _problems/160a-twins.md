---
# generated: build_problems.py
pid: "160A"
title: "160A Twins"
---
{% raw %}
## My notes

Take the FEWEST coins so that your total is STRICTLY MORE than what's left for your twin.

GREEDY: take the biggest coins first, since they get you over half fastest.

Loop 1: read each coin, push_back it into coins, and add it to total.

`Sort biggest to smallest: std::sort(coins.begin(), coins.end(), std::greater<int>());`

`Loop 2: mine += coins[j] (+=, not =), count++, then if (mine > total - mine) break;`

break exits the loop immediately, so nothing after it in the loop runs.

Print count (HOW MANY coins), not mine (their value), AFTER the loop.

Complexity: O(n log n), because of the sort

## Code

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

int main(){

    int n;
    std::cin >> n;

    std::vector<int> coins;

    int total {};
    int mine {0};
    int count {0};

    for(int i = 0; i < n; i++){

        int x {};
        std::cin >> x;

        coins.push_back(x);

        total += x;

    }

    std::sort(coins.begin(), coins.end(), std::greater<int>());

    for(int j = 0; j < coins.size(); j++){

        mine += coins [j];
        count++;
        if(mine > total - mine){

            break;
        }


    }

    std::cout << count;
    return 0;
}
```

{% endraw %}
