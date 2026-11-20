---
# generated: build_problems.py
pid: "339A"
title: "339A Helpful Maths"
---
{% raw %}
## Code

```cpp
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

int main(){

    std::string n;
    std::cin >> n;

    std::vector<char> sum;

    for(int i = 0; i < n.size() ; i++){

        if(n[i] != '+'){

            sum.push_back(n[i]);

        }

    }

    std::sort(sum.begin(), sum.end());

    for (int i = 0; i < sum.size();i++){
        std::cout << sum [i];
        if(i != sum.size()-1){
            std::cout << '+';
        }
    }


    return 0;
}
```

{% endraw %}
