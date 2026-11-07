---
# generated: build_problems.py
pid: "1791E"
title: "1791E Negatives and Positives"
---
{% raw %}
## My notes

CF 1791E - Negatives and Positives (rating 1100, modern Div. 4)

Operation: flip the signs of two NEIGHBOURING elements, any number of times. Maximise the sum.

INVARIANT: each flip changes the number of negatives by -2, 0 or +2, so its PARITY never changes.

Even count → all negatives can be cancelled, so the answer = the sum of absolute values (S).

Odd count → exactly one negative must remain; flips can MOVE it anywhere,

so put it on the smallest absolute value m. Answer = S - 2m

(+x → -x loses x twice). A 0 in the array makes m = 0, so there's no loss.

One pass per test case, no vector: count the negatives, S += abs(x), track the smallest abs(x).

smallest starts HUGE (2e9); S is a long long (up to 2e14).

+= means add to; =+ means "set to +x" (a recurring bug!).

Complexity: O(n) total (the sum of n is bounded), O(1) space.

Nested loops ≠ O(n²): count how many times the innermost line runs in TOTAL.

## Code

```cpp
#include <iostream>
#include <cmath>

int main()
{

    int t{};
    std::cin >> t;

    for (int i = 0; i < t; i++)
    {

        long long sum{};
        int n{};
        int count{};
        int smallest{2000000000};

        std::cin >> n;

        for (int j = 0; j < n; j++)
        {

            int x;
            std::cin >> x;

            if (x < 0)
            {

                count++;
            }

            sum += abs(x);
            if (abs(x) < smallest){

                smallest=abs(x);
            }
        }

        if (count % 2 == 0)
        {

            std::cout << sum << '\n';
        }
        else
        {
            std::cout << sum - 2 * smallest << '\n';
        }
    }

    return 0;
}
```

{% endraw %}
