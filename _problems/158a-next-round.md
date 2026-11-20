---
# generated: build_problems.py
pid: "158A"
title: "158A Next Round"
---
{% raw %}
## My notes

n participants, scores given in non-increasing order. A person advances if their

score is >= the k-th place score AND the score is positive (0 never advances).

Shortcut: the k-th place score is scores[k - 1] (0-indexed), so it's the cutoff.

Loop 1: read scores (counter i). Loop 2: check each score (counter j).

Compare scores[j] against the cutoff, and use j in BOTH parts of the if, not k - 1.

Decision happens INSIDE loop 2 (one check per participant); print AFTER both loops.

No else needed: failing scores simply aren't counted.

Ties work automatically because of >=.

Complexity: O(n) time, O(n) space

## Code

```cpp
#include <iostream>
#include <vector>

int main (){

    int n {};
    std::cin >> n;

    int k {};
    std::cin >> k;

    int count {0};

    std::vector<int> scores;

    for(int i = 0; i < n; i++){

        int x {};
        std::cin >> x;

        scores.push_back(x);
        
    }

    for(int j = 0; j < n; j++){

        if(  scores[j] >= scores[k - 1] && scores[j] > 0){

            count++;
        }

    }

    std::cout << count;

    return 0;
}
```

{% endraw %}
