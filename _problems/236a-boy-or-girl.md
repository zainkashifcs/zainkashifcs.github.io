---
# generated: build_problems.py
pid: "236A"
title: "236A Boy or Girl"
---
{% raw %}
## My notes

Count the DIFFERENT letters in the username (each letter counts once).

Even number of distinct letters → "CHAT WITH HER!", odd → "IGNORE HIM!" Trick: SORT the string first, so identical letters sit next to each other.

`std::sort works on strings too: std::sort(n.begin(), n.end());`

count starts at 1 (the first letter is always new), and the loop starts at i = 1.

If n[i] != n[i - 1], it's a new letter, so count++ (same idea as 344A Magnets).

Decide even/odd AFTER the loop with count % 2. Copy the output phrases exactly.

Loop through a string with n.size(), not n.

Complexity: O(n log n), because of the sort

## Code

```cpp
#include <iostream>
#include <string>
#include <algorithm>

int main (){
    
    std::string n;
    std::cin >> n;

    int count {1};

    std::sort(n.begin(), n.end());

    for(int i = 1; i < n.size(); i++){

        if( n[i] != n[i - 1]){

            count++;
        }

    }

    if( count % 2 == 0){

        std::cout << "CHAT WITH HER!" << '\n';
    }
    else{

        std::cout << "IGNORE HIM!" << '\n';
    }


    
    return 0;
}
```

{% endraw %}
