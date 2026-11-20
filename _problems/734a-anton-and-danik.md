---
# generated: build_problems.py
pid: "734A"
title: "734A Anton and Danik"
---
{% raw %}
## My notes

n games; the string x has 'A' (Anton won) or 'D' (Danik won) for each game.

Read n and the WHOLE string once, before the loop (it's one string, not n strings).

Two counters, countA and countD, start at 0 BEFORE the loop.

Inside the loop: look at x[i] (i moves along the string, not n).

If x[i] == 'A', countA++; else countD++.

AFTER the loop: compare the counters, printing Anton, Danik or Friendship (exact spelling).

else never has a condition: it's either else { } or else if (...) { }.

Complexity: O(n)

## Code

```cpp
#include <iostream>
#include <string>

int main()
{

    int n;
    std::cin >> n;

    std::string x;
    std::cin >> x;

    int countA{0};
    int countD{0};

    for (int i = 0; i < n; i++)
    {

        if (x[i] == 'A')
        {

            countA = countA + 1;
        }

        else
            {
            

                countD = countD + 1;
            }
    }

    if(countA > countD){

        std::cout << "Anton";
    }

    else if(countD > countA){

        std::cout << "Danik";
    }

    else{
        std::cout << "Friendship";
    }

    return 0;
}
```

{% endraw %}
