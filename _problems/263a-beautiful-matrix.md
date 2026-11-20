---
# generated: build_problems.py
pid: "263A"
title: "263A Beautiful Matrix"
---
{% raw %}
## My notes

A 5x5 grid of 0s with one 1. A move swaps two neighbouring rows or columns.

Minimum moves to get the 1 to the CENTRE?

Positions go 0-4, so the centre is row 2, column 2.

NESTED LOOPS: outer loop = rows (i), inner loop = columns (j). 25 numbers read in total.

Read each number INSIDE the inner loop; if x == 1, remember row = i, col = j.

row and col are trackers, so they're created BEFORE the loops.

Each swap moves the 1 one step, so moves = distance from the centre:

abs(row - 2) + abs(col - 2)

abs() = "how far away", ignoring minus signs (needs <cmath>).

No vector needed: there's nothing to store, just a position to remember.

Complexity: O(1), since the grid is always 5x5

## Code

```cpp
#include <iostream>
#include <vector>
#include <cmath>


int main(){

    int row {};
    int col {};


    for (int i = 0; i < 5 ; i++){
        

        


        for(int j = 0; j < 5; j++){

            int x {};
            std::cin >> x;

            if( x == 1){

                row = i;
                col = j;
            }


        }
    }

    std::cout << abs(row - 2) + abs(col - 2);
}
```

{% endraw %}
