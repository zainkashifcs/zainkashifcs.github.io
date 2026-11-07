---
# generated: build_problems.py
pid: "4C"
title: "4C Registration System"
---
{% raw %}
## My notes

Each request is a username. New name → "OK". Taken → the name + a number (name1, name2, ...).

map<string, int> count: how many times each name has been requested so far.

Created BEFORE the loop and never reset: it must REMEMBER every earlier request.

count[name] starts at 0 automatically for a new name.

Inside the loop: read the name, then:

count[name] == 0 → print "OK"

otherwise → print name << count[name]

then count[name]++ (PRINT FIRST, THEN COUNT, or you'd get bob2 instead of bob1) Each request is answered straight away, inside the loop. Nothing printed after it.

Complexity: O(n log n), from the map operations

## Code

```cpp
#include <iostream>
#include <string>
#include <map>

int main(){

    int n {};
    std::cin >> n;
    std::map<std::string, int> count;

    for (int i = 0; i < n; i++){
        
        std::string name;
        std::cin >> name;

        if(count[name] == 0){

            std::cout << "OK" << '\n';
            count[name]++;
        }

        else{
        
            std::cout << name << count[name] << '\n';
            count[name]++;
        }
    }



    return 0;
}
```

{% endraw %}
