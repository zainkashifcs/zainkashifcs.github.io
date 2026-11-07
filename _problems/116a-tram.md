---
# generated: build_problems.py
pid: "116A"
title: "116A Tram"
---
{% raw %}
## My notes

The tram starts empty. At each stop, a people get off, THEN b people get on.

Answer = the most people ever on board at once (the minimum capacity).

Pattern: read n, then read a and b INSIDE the loop, once per stop.

onBoard = onBoard - a + b: a running total

if (onBoard > most) most

## Code

```cpp
#include <iostream>

int main (){

    int n {};
    std::cin >> n;
    int onBoard{0};// people on tram
    int most {0};  //the biggest on Board

    for(int i = 0; i < n ;i++){
        int a {};
        int b {};
        std::cin >> a;
        std::cin >> b;
        
        onBoard= onBoard - a + b;

        if(onBoard > most){
            most= onBoard;
        }

        
    }

    std::cout << most;


    return 0;
}
```

{% endraw %}
