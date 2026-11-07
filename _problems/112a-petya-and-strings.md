---
# generated: build_problems.py
pid: "112A"
title: "112A Petya and Strings"
---
{% raw %}
## My notes

Compare two strings, IGNORING upper/lowercase.

s1 comes first alphabetically → -1, s2 comes first → 1, same → 0

Step 1: lowercase every letter of both strings (s1[i] = tolower(s1[i]), same for s2).

tolower needs <cctype>. Both strings are the same length.

Step 2: compare the WHOLE strings with < and >, which work alphabetically, like a dictionary.

No vector needed: just two strings and an if / else if / else.

Complexity: O(n)

## Code

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <cctype>

int main(){
    
    std::string s1;
    std::string s2;

    std::cin >> s1;
    std::cin >> s2;


    for(int i = 0; i < s1.size(); i++){

        s1[i] = tolower(s1[i]);
    }

    for(int j = 0; j < s2.size(); j++){

        s2[j] = tolower(s2[j]);
    }

    if( s1 < s2 ){

        std::cout << -1;
    }

    else if( s1 > s2){

        std::cout << 1;
    }

    else{

        std:: cout << 0;
    }


    return 0;
}
```

{% endraw %}
