---
# generated: build_problems.py
pid: "1703A"
title: "1703A YES or YES?"
---
{% raw %}
## My notes

t test cases; each is a 3-letter string. YES if it's "yes" in ANY mix of upper/lowercase.

Shortcut: lowercase every letter first, then compare the whole string with "yes".

Outer loop: test cases (counter i). Inner loop: letters of the word (counter j).

s[j] = tolower(s[j]) changes each letter. Use j here, not i!

Decision AFTER the letter loop (the whole word must be lowercased first), but INSIDE the test-case loop (one answer per word).

Single quotes 'a' for one character, double quotes "yes" for a whole string.

Complexity: O(1) per test case (the word is only 3 letters)

## Code

```cpp
#include <iostream>
#include <string>
#include <cctype>

int main()
{

    int t{};
    std::cin >> t;

    std::string s;

    for (int i = 0; i < t; i++)
    {

        std::cin >> s;

        for (int j = 0; j < s.size(); j++)
        {
            s[j] = tolower(s[j]);
        }

        if (s == "yes")
        {
            std::cout << "YES" << '\n';
        }

        else
        {
            std::cout << "NO" << '\n';
        }
    }

    return 0;
}
```

{% endraw %}
