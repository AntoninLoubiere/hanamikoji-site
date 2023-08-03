from random import shuffle

def random_manche():
    l = [0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6]
    shuffle(l)
    return l

for i in range(3):
    print(' '.join(map(str, random_manche())))