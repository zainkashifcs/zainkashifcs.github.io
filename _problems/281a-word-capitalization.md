---
# generated: build_problems.py
pid: "281A"
title: "281A Word Capitalization"
---
{% raw %}
## My notes

Problem: capitalise the first letter of a word, leave the rest unchanged.

Insight: chars are numbers; lowercase is 32 above uppercase ('a'=97, 'A'=65),

so s[0] - 32 turns a lowercase first letter into a capital.

Edge case: if the first letter is already a capital, print the word as is (subtracting 32 from a capital would break it).

Complexity: O(1), only the first character is touched.

## Code

```cpp
#include <iostream>
#include <string>

int main (){
    std::string s;
    std::cin >> s;

    if(s[0] >= 'A' && s[0] <= 'Z'){
        std::cout << s;
    }

    else{
        s[0]= s[0] - 32;
        std::cout << s;
        
    }
    
    return 0;
}
```

{% endraw %}
