---
# generated: build_problems.py
pid: "59A"
title: "59A Word"
---
{% raw %}
## My notes

Problem: make a word all upper or all lower case, whichever needs fewer changes (tie goes to lowercase).

Insight: only need to count capitals - if capitals <= size/2, lowercase wins.

Structure: count EVERYTHING first (loop 1), then decide, then fix (loop 2 or 3).

Bug I hit: deciding inside the counting loop, before the count was finished.

Complexity: O(n), each letter looked at a couple of times.

## Code

```cpp
#include <iostream>
#include <string>

int main()
{
    std::string s;
    std::cin >> s;
    int total{0};

    for (int i = 0; i < s.size(); i++)
    {

        if (s[i] >= 'A' && s[i] <= 'Z')
        {
            total++;
        }
    }

    if (total <= s.size() / 2)
    {
        for (int i = 0; i < s.size(); i++)
            if (s[i] >= 'A' && s[i] <= 'Z')
            {
                s[i] = s[i] + 32;
            }
    }

    else
    {
        for (int i = 0; i < s.size(); i++)
            if (s[i] >= 'a' && s[i] <= 'z')
            {
                s[i] = s[i] - 32;
            }
    }

    std::cout << s;

    return 0;
    
}
```

{% endraw %}
