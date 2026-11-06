---
title: "1A Theatre Square"
link: "https://codeforces.com/problemset/problem/1/A"
tags: ["math", "implementation"]
solution: "CF Questions/1_A_Theatre_Square.cpp"
---
{% raw %}
## Idea

Cover an n x m square with a x a tiles (tiles can go past the edge). How many tiles?
Tiles along each side = that side / a, ROUNDED UP:
if (n % a != 0) then n / a + 1, otherwise n / a (the same for m).
Answer = tilesN * tilesM. No loop needed: it's pure maths. Complexity: O(1).

## Lesson

% = remainder, / = division. Don't mix them up!
Use integer rounding, NOT ceil() (decimals can be inaccurate with huge numbers).
LONG LONG everywhere: n and m are up to 1e9, so the answer can reach 1e18,
and an int (max ~2.1e9) would overflow.

## Code

```cpp
#include <iostream>

int main(){

    long long n {};
    long long a {};
    long long m {};
    long long total {};

    std:: cin >> n;
    std:: cin >> m;
    std:: cin >> a;

    if (n % a != 0){
        n = n / a + 1;
    }
    
    else{
        n = n / a;
    }

    if( m % a != 0){

        m = m / a + 1;
    }

    else{
        
        m= m / a ;
    }

    total = m * n;
    std::cout << total;
    


    return 0;
}
```
{% endraw %}
