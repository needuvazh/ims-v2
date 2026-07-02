import pty
import os
import sys

def run():
    env = os.environ.copy()
    env["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5435/ims_dev?schema=public"
    
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir("packages/database")
        os.execvpe("npx", ["npx", "prisma", "migrate", "dev"], env)
    else:
        # parent process
        output = b""
        while True:
            try:
                data = os.read(fd, 1024)
            except OSError:
                break
            if not data:
                break
            output += data
            sys.stdout.write(data.decode("utf-8", errors="replace"))
            sys.stdout.flush()
            
            if b"y/N" in data or b"yes" in data.lower():
                os.write(fd, b"y\n")

        os.waitpid(pid, 0)

run()
