---
# generated: build_problems.py
pid: "344A"
title: "344A Magnets"
---
{% raw %}
## My notes

n magnets in a row, each "01" or "10". Count the groups.

A new group starts whenever a magnet DIFFERS from the one before it.

Read the FIRST magnet into prev before the loop; group starts at 1.

The loop runs for the remaining n - 1 magnets (i starts at 1).

Inside: read cur. If prev != cur, it's a new group (group++), and prev = cur.

(Updating prev only when they differ works, because if they're the same, prev == cur already.)

!= compares whole strings, so there's no need to loop through the letters.

Print group ONCE, after the loop.

Complexity: O(n)

## Code

```cpp
#include <iostream>
#include <string>

int main()
{

    int n{};
    std::cin >> n;

    std::string prev;
    std::cin >> prev;
    int group{1};

    for (int i = 1; i < n; i++)
    {

        std::string cur;
        std::cin >> cur;


        if (prev != cur)
        {
            prev = cur;
            group = group + 1;
        }

    }

    std::cout << group;

    return 0;
}
```

{% endraw %}
