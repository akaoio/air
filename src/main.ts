import { db } from "./db"
const main = async () => {
    await db.start()
}
main()
