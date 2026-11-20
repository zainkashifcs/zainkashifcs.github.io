---
# generated: build_problems.py
pid: "2275B"
title: "2275B Did Not Go to Print"
---
{% raw %}
## Code

```cpp
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

int main(){

    int t {};
    std::cin >> t;

    int n {};
    std::string s;
    


    for(int i = 0; i < t; i++){

        std::cin >> n;
        std::cin >> s;

        std::vector<int> pile;
        std::vector<int> unprinted;

        for(int j = 0; j < s.size(); j++){

            if(s[j] == '1' ){

                pile.push_back(j+1);

            }

            else if ( s[j] == '2' && !pile.empty()){

                unprinted.push_back(j + 1);
                pile.pop_back();

                
            }


        }

        for(int k = 0; k < pile.size(); k++){

            unprinted.push_back(pile[k]);
        }

            std::sort(unprinted.begin(), unprinted.end());


        

        std::cout << unprinted.size() << '\n';

        for(int x = 0; x < unprinted.size(); x++){

            std::cout << unprinted [x];
            if(x != unprinted.size()-1){
                std::cout << ' ';
            }
        }
        std::cout << '\n';
    }


    return 0;
}
```

{% endraw %}
