# tilebased-map-generator

# EN

This project is researching vmf (Valve Map Format) format parsing and modification.

# Installation

0. You will need NodeJS v10 or newer. 
1. Extract downloaded archive to any folder you like.
2. Place your tiles into tiles folder or take one that supplied in this repository from subdirectories.
3. Run main.bat and script will produce you combined.vmf file.
4. If you like to create tiles for project you can add .fgd file into your hammer.

# Running arguments
main.js MAXIMUM_PLACED_TILES SEED // You can add that arguments in main.bat  
  
MAXIMUM_PLACED_TILES - Goal amount of tiles needed to be placed.  
SEED - 8 character long string that contains only numbers and english letters  

# How it works?

combined.vmf is produced by mixing together smaller vmf files in tiles folder.  
Every tile vmf contains cordons as boundries of tile and func_portaldoor pseudo-entity on cordon's edges.  
Firstly script loads every tile, it generates rotated version of them too on that phase.  
Also it markes specific tiles like once_, post_, meta_ prefixes in file names.  
Then script decides meta tile. (You can influence that by adding prefix meta_ to vmf name)  
Script randomly tries to add matching tile to every unoccupied func_portaldoor.  
If tile have once_ prefix in it name then it will be only used once in combined.vmf.  
Every time tile is about to be added to combined.vmf it gets checked by function in tiles/rules.js if function returns true then tile won't be placed.  
If script can't place enough tiles into combined.vmf then it will try again and again.  
Then script tries to add every post_ tile into combined.vmf, it will warn you if it fails.  
After that script will merge tiles together and write it out in combined.vmf.  

# Is there any changes performed in placed tiles?

Yes, script will append index of placed tile into every target name found (that not starting from global_) in every propertie of every object.  
You can create variants of the same tile by making special visgroups starting with variant_, so you can add more variance and not create many copies of the same file over and over again. 
Also every object IDs in every placed tiles is increased by maximum number of ID.  
  
# RU

Этот проект исследует парсинг и модификацию формата vmf (Valve Map Format).

# Установка

0. Вам понадобится NodeJS v10 или новее.
1. Извлеките загруженный архив в любую удобную папку.
2. Поместите свои тайлы в папку tiles или возьмите те, которые поставляется вместе с этим архивом из подкаталогов.
3. Запустите main.bat, и скрипт сгенерирует вам combined.vmf.
4. Если вы хотите создавать свои тайлы для проекта, вы можете добавить .fgd файл в свой Hammer Editor.

# Аргументы запуска
main.js МАКСИМАЛЬНОЕ_КОЛИЧЕСТВО_ТАИЛОВ СИД // Вы можете добавить эти аргументы в main.bat  
  
МАКСИМАЛЬНОЕ_КОЛИЧЕСТВО_ТАИЛОВ - Количество тайлов которое должно быть поставлено.  
СИД - 8 значный текст состоящий из цифр и букв английского алфавита.  

# Как это устроено?

combined.vmf создается путем смешивания меньших файлов vmf в папке tiles.  
Каждый тайл vmf содержит кордоны как границы тайла и псевдо-ентити func_portaldoor по краям кордонов.  
Во-первых, скрипт загружает каждый тайл, он также генерирует повернутые версии этого тайла.  
Также он помечает тайлы с специальными префиксами once_, post_, meta_ в именах файлов.  
Затем скрипт выбирает метатайл. (Вы можете повлиять на это, добавив префикс meta_ к имени vmf)  
Скрипт случайным образом пытается добавить подходящий тайл к каждому незанятому func_portaldoor.  
Если в тайле есть префикс once_, то тайл будет использоваться только один раз в combined.vmf.  
Каждый раз, когда тайл пытается добавиться в combined.vmf, он проверяется функцией в файле tiles/rules.js, если функция возвращает значение true,то тайл не будет размещен.  
Если скрипт не может разместить достаточно тайлов в combined.vmf, он будет пытаться снова и снова.  
Затем скрипт пытается добавить каждую тайлы post_ в combined.vmf, скрипт предупредит вас в случае неудачи.  
После этого скрипт объединит тайлы и запишет их в combined.vmf.  

# Есть ли какие-либо изменения в размещенных тайлах?

Да, скрипт добавит индекс тайла в каждый найденный targetname, который не начинается с префикса global_, в каждое поле каждого обьекта.  
Вы можете создавать варианты одного и того же тайла, с помощью специальных visgroup'ов, название которых начинается с variant_, так что вы можете добавить больше вариативности и не создавать много копий одного и того же файла снова и снова.  
Также ID каждого обьекта в каждом поставленном тайле увеличиваются на максимальное количество ID метатайла.  
