---
# generated: build_problems.py
pid: "1791D"
title: "1791D Distinct Split"
---
{% raw %}
## My notes

CF 1791D - Distinct Split (rating 1000)  [ASSISTED: looked up, redo from scratch in 3 days]

Split s into two NON-EMPTY parts; maximise distinct(left) + distinct(right).

Brute force: try every split and recount both sides → O(n²), too slow for n = 2e5.

SWEEP with two maps: right starts with ALL letters counted, left starts empty.

At each split j: move s[j] across (left[c]++, right[c]--).

If right[c] hits 0, ERASE it, so right.size() only counts letters actually present.

Distinct counts = left.size() and right.size(); track the max of their sum.

Each letter moves once, so O(n log 26) = O(n) time, and O(26) = O(1) space.

## Attempt (not counted as solved)

```cpp
#include <iostream>
#include <string>
#include <map>
#include <algorithm>

int main(){

    int t {};
    std::cin >> t;
    
    for(int i = 0; i < t; i++){

        int n {};
        std::cin >> n;

        std::string s;
        std::cin >> s;

        std::map<char, int > left;
        std::map<char, int> right;

        for( char c : s){
            right[c]++;
        }

        int best = 0;

        for(int j = 0; j < n - 1; j++){
            char current = s[j];

            left[current]++;
            right[current]--;

            if(right[current] == 0){
                right.erase(current);
            }

            int total = left.size() + right.size();

            best = std::max(best,total);




            
        }
        std::cout << best << '\n';
    }
    return 0;
}
```

{% endraw %}
