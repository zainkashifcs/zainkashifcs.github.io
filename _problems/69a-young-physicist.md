---
# generated: build_problems.py
pid: "69A"
title: "69A Young Physicist"
---
{% raw %}
## My notes

n forces, each with x, y and z parts. Balanced if ALL three totals are 0.

Trackers (xf, yf, zf) are created BEFORE the loop, so they keep adding up.

Inside the loop: read this force, then add it: xf += x (total on the LEFT).

Decision AFTER the loop: you need ALL the forces before you can answer.

+= means "add to"; =+ is a different (wrong) thing.

Complexity: O(n)

## Code

```cpp
#include <iostream>

int main (){

    int n{};
    int x{};
    int y{};
    int z{};

    int xf {};
    int yf {};
    int zf {};

    std::cin >> n;

    for(int i = 0; i < n; i++){

        std::cin >> x;
        std::cin >> y;
        std::cin >> z;

        xf += x;
        yf += y;
        zf += z;
    }
    

        if(xf == 0 && yf == 0 && zf == 0){
            std::cout << "YES";
        }

        else{
            std::cout << "NO";
        }


    
 return 0;
}
```

{% endraw %}
